import { buildRealtimeSessionUpdate, RealtimeStateMachine } from "../index.js";

export type MinimalMediaStream = {
  getTracks(): Array<{ stop(): void }>;
};

export type MinimalDataChannel = {
  readyState: string;
  send(data: string): void;
  close(): void;
  onopen: (() => void) | null;
  onmessage: ((event: { data: string }) => void) | null;
};

export type MinimalPeerConnection = {
  createDataChannel(label: string): MinimalDataChannel;
  addTrack(track: unknown, stream: MinimalMediaStream): void;
  createOffer(): Promise<{ type: "offer"; sdp?: string }>;
  setLocalDescription(description: unknown): Promise<void>;
  setRemoteDescription(description: unknown): Promise<void>;
  close(): void;
  ontrack: ((event: { streams: MinimalMediaStream[] }) => void) | null;
  onconnectionstatechange: (() => void) | null;
  connectionState?: string;
};

export type WebRtcClientDependencies = {
  createPeerConnection(): MinimalPeerConnection;
  getUserMedia(): Promise<MinimalMediaStream>;
  exchangeSdp(localSdp: string): Promise<string>;
  attachRemoteAudio(stream: MinimalMediaStream): void;
  onMessage(event: unknown): void;
  onStateChange(state: string): void;
};

export class RealtimeWebRtcClient {
  private readonly stateMachine = new RealtimeStateMachine();
  private readonly deps: WebRtcClientDependencies;
  private peer: MinimalPeerConnection | null = null;
  private dataChannel: MinimalDataChannel | null = null;
  private localStream: MinimalMediaStream | null = null;

  constructor(deps: WebRtcClientDependencies) {
    this.deps = deps;
  }

  async connect(model: string, voice: string): Promise<void> {
    this.transition("load_token");
    this.transition("create_peer");
    this.peer = this.deps.createPeerConnection();
    this.peer.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteStream) this.deps.attachRemoteAudio(remoteStream);
    };
    this.peer.onconnectionstatechange = () => {
      if (this.peer?.connectionState === "failed" || this.peer?.connectionState === "disconnected") {
        this.transition("reconnect");
      }
    };
    this.dataChannel = this.peer.createDataChannel("oai-events");
    this.dataChannel.onmessage = (event) => this.deps.onMessage(JSON.parse(String(event.data)));
    this.localStream = await this.deps.getUserMedia();
    for (const track of this.localStream.getTracks()) {
      this.peer.addTrack(track, this.localStream);
    }
    const offer = await this.peer.createOffer();
    await this.peer.setLocalDescription(offer);
    this.transition("offer_created");
    this.transition("connect");
    const answer = await this.deps.exchangeSdp(offer.sdp ?? "");
    await this.peer.setRemoteDescription({ type: "answer", sdp: answer });
    this.transition("connected");
    this.sendSessionUpdate(model, voice);
  }

  sendSessionUpdate(model: string, voice: string): void {
    this.send(buildRealtimeSessionUpdate(model, voice));
  }

  createResponse(): void {
    this.send({ type: "response.create" });
  }

  cancelResponse(responseId?: string): void {
    this.send(responseId ? { type: "response.cancel", response_id: responseId } : { type: "response.cancel" });
  }

  async reconnect(model: string, voice: string): Promise<void> {
    this.cleanup();
    this.transition("reconnect");
    await this.connect(model, voice);
  }

  cleanup(): void {
    this.dataChannel?.close();
    this.dataChannel = null;
    this.localStream?.getTracks().forEach((track) => track.stop());
    this.localStream = null;
    this.peer?.close();
    this.peer = null;
  }

  private send(event: unknown): void {
    if (!this.dataChannel || this.dataChannel.readyState !== "open") {
      throw new Error("Realtime data channel is not open");
    }
    this.dataChannel.send(JSON.stringify(event));
  }

  private transition(event: Parameters<RealtimeStateMachine["transition"]>[0]): void {
    const state = this.stateMachine.transition(event);
    this.deps.onStateChange(state);
  }
}
