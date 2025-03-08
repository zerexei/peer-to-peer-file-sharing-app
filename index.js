let peerConnection = null;

const elements = {
  peerStartSession: document.querySelector("button.peer-start-session"),
  peerId: document.querySelector(".peer-id"),
};

class PeerConnection {
  session = null;
  connections = new Map();

  constructor() {
    this.session = new Peer();

    peer.on("open", function (id) {
      this.connections.set(id, true);
      this.setPeerId(id);
    });
  }

  setPeerId(id) {
    elements.peerId.innerText = `ID: ${id}`;
  }
}

elements.peerStartSession.addEventListener("click", () => {
  peerConnection = new PeerConnection();
});
