let peerConnection = null;

const elements = {
  peerId: document.querySelector(".peer-id"),

  peerLoading: document.querySelector(".peer-loading"),

  peerWelcome: document.querySelector(".peer-welcome"),
  peerSession: document.querySelector(".peer-session"),
  peerConnections: document.querySelector(".peer-connections"),
};

const loadingStart = () => {
  elements.peerLoading.classList.remove("hidden");
};

const loadingEnd = () => {
  elements.peerLoading.classList.add("hidden");
};

class PeerConnection {
  session = null;
  connections = new Map();
  selectedConnectionId = null;

  constructor() {}

  async startSession() {
    if (this.session) {
      throw new Error("Session already started");
    }

    return new Promise((resolve, reject) => {
      try {
        this.session = new Peer();

        this.session.on("open", (id) => {
          // this.connections.set(id, true);
          this.#setPeerId(id);

          this.session.on("connection", function (conn) {
            console.log("Connected to: " + conn.peer);

            conn.on("data", function (data) {
              if (data?.dataType === "file") {
                const blob = new Blob([data.file], { type: data.fileType });
                console.log(blob, data);

                // const url = URL.createObjectURL(blob);
                // const link = document.createElement("a");
                // link.href = url;
                // link.download = data.fileName;
                // link.click();
                // URL.revokeObjectURL(url);
                return;
              }

              console.log(data);
            });
          });

          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async destroySession() {
    if (!this.session) {
      throw new Error("Session not started");
    }

    this.session.destroy();
  }

  getPeerId() {
    return this.session.id;
  }

  async connect(peerId) {
    return new Promise((resolve, reject) => {
      try {
        if (!this.session) {
          throw new Error("Session not started");
        }

        if (this.connections.has(peerId)) {
          throw new Error("Connection already established");
        }

        const connection = this.session.connect(peerId, { reliable: true });

        // !FIXME: cannot validate connection
        connection.on("open", () => {
          console.log("Connect to: " + peerId);
          this.connections.set(peerId, connection);
          this.selectedConnectionId = peerId;
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  sendPayload = (payload) => {
    if (!this.session) {
      throw new Error("Session not started");
    }

    if (!this.selectedConnectionId) {
      throw new Error("No connection selected");
    }

    if (!payload) {
      throw new Error("No payload provided");
    }

    const connection = this.connections.get(this.selectedConnectionId);

    if (!connection) {
      throw new Error("Connection not found");
    }

    connection.send(payload);
  };

  #setPeerId(id) {
    elements.peerId.innerText = `ID: ${id}`;
  }
}

const startSession = async () => {
  loadingStart();
  peerConnection = new PeerConnection();
  await peerConnection.startSession();

  elements.peerSession.classList.remove("hidden");
  elements.peerWelcome.classList.add("hidden");

  loadingEnd();
};

const destroySession = () => {
  peerConnection.destroySession();

  elements.peerSession.classList.add("hidden");
  elements.peerWelcome.classList.remove("hidden");
};

const copySessionId = async () => {
  if (!peerConnection) {
    throw new Error("Peer connection not started");
  }

  if (!navigator.clipboard) {
    throw new Error("Clipboard not supported");
  }

  const peerId = peerConnection.getPeerId();

  await navigator.clipboard.writeText(peerId);

  Toastify({
    text: "Peer ID copied to clipboard",
  }).showToast();
};

const connect = async (event) => {
  event.preventDefault();

  const formData = new FormData(event.target);
  const peerId = formData.get("peer-connect-id");

  loadingStart();
  await peerConnection.connect(peerId);

  Toastify({
    text: "Connection established",
  }).showToast();

  // event.target.reset();

  const keys = Array.from(peerConnection.connections.keys());
  const connections = keys
    .map(
      (peerId) =>
        `<li class="p-2 cursor-pointer hover:bg-teal-400 bg-teal-200 rounded-md">${peerId}</li>`
    )
    .join("");

  elements.peerConnections.innerHTML = `<ul class="space-y-1">${connections}</ul>`;

  loadingEnd();
};

const sendPayload = (event) => {
  event.preventDefault();

  const formData = new FormData(event.target);
  let payload = formData.get("peer-message");

  if (formData.get("peer-payload-type") === "file") {
    const file = formData.get("peer-payload-file");

    payload = {
      dataType: "file",
      file,
      fileName: file.name,
      fileType: file.type,
    };
  }

  peerConnection.sendPayload(payload);
  Toastify({
    text: "Payload sent",
  }).showToast();

  event.target.reset();
};
