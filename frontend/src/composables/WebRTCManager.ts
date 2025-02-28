export class WebRTCManager {
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private signalingServer: WebSocket;

  constructor(private playerGUID: string) {
    this.signalingServer = new WebSocket("ws://localhost:8080/ws");

    this.signalingServer.onopen = () => {
      this.signalingServer.send(JSON.stringify({ guid: this.playerGUID }));
    };

    this.signalingServer.onmessage = this.handleSignalingMessage;
  }

  private handleSignalingMessage = (event: MessageEvent) => {
    const message = JSON.parse(event.data);
    const { type, target, sdp, candidate } = message;

    if (type === "offer") {
      this.handleOffer(target, sdp);
    } else if (type === "answer") {
      this.handleAnswer(target, sdp);
    } else if (type === "candidate") {
      this.handleCandidate(target, candidate);
    }
  };

  private async handleOffer(targetGUID: string, sdp: string) {
    const peerConnection = this.createPeerConnection(targetGUID);
    await peerConnection.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp }));

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    this.signalingServer.send(JSON.stringify({
      type: "answer",
      target: targetGUID,
      sdp: answer.sdp
    }));
  }

  private async handleAnswer(targetGUID: string, sdp: string) {
    const peerConnection = this.peerConnections.get(targetGUID);
    if (peerConnection) {
      await peerConnection.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp }));
    }
  }

  private async handleCandidate(targetGUID: string, candidate: RTCIceCandidateInit) {
    const peerConnection = this.peerConnections.get(targetGUID);
    if (peerConnection) {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }

  private createPeerConnection(targetGUID: string): RTCPeerConnection {
    const peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.signalingServer.send(JSON.stringify({
          type: "candidate",
          target: targetGUID,
          candidate: event.candidate
        }));
      }
    };

    this.peerConnections.set(targetGUID, peerConnection);
    return peerConnection;
  }

  async createOffer(targetGUID: string) {
    const peerConnection = this.createPeerConnection(targetGUID);
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    this.signalingServer.send(JSON.stringify({
      type: "offer",
      target: targetGUID,
      sdp: offer.sdp
    }));
  }

  closeConnection(targetGUID: string) {
    const peerConnection = this.peerConnections.get(targetGUID);
    if (peerConnection) {
      peerConnection.close();
      this.peerConnections.delete(targetGUID);
    }
  }
}
