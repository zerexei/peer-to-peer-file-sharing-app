let peerConnection = null;

const elements = {
  loadingOverlay: document.querySelector("[data-target='loading-overlay']"),

  peerId: document.querySelector(".peer-id"),
  peerWelcome: document.querySelector(".peer-welcome"),
  peerSession: document.querySelector(".peer-session"),
  peerConnections: document.querySelector(".peer-connections"),

  formPeerConnect: document.querySelector("[data-target='form-peer-connect']"),
  formSendPayload: document.querySelector("[data-target='form-send-payload']"),
};

const validateAllElementExists = () => {
  for (const element in elements) {
    if (!elements[element]) {
      document
        .querySelector("[data-target='error-500']")
        ?.classList.remove("hidden");

      throw new Error(`Element ${element} is required.`);
    }
  }
};

validateAllElementExists();

const loadingStart = () => elements.loadingOverlay.classList.remove("hidden");
const loadingEnd = () => elements.loadingOverlay.classList.add("hidden");

class PeerConnection {
  session = null;
  connections = new Map();
  selectedConnectionId = null;

  getPeerId() {
    return this.session.id;
  }

  async startSession() {
    if (this.session) {
      throw new Error("Session already started");
    }

    return new Promise((resolve, reject) => {
      try {
        this.session = new Peer();

        this.session.on("open", (id) => {
          this.#updatePeerIdUI(id);

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

  destroySession() {
    if (!this.session) {
      throw new Error("Session not started");
    }

    this.session.destroy();
    this.#resetPeer();
  }

  async connect(peerId) {
    return new Promise((resolve, reject) => {
      try {
        this.#validatePeerId(peerId);

        const connection = this.session.connect(peerId, { reliable: true });

        this.#validateConnection(connection);

        connection.on("open", () => {
          this.connections.set(peerId, connection);
          this.selectedConnectionId = peerId;

          this.#updateConnectionsListUI();
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  sendPayload = (payload) => {
    if (!this.session) {
      throw new Error("Session not started.");
    }

    if (!this.selectedConnectionId) {
      throw new Error("No connection selected.");
    }

    if (!payload) {
      throw new Error("No payload provided.");
    }

    const connection = this.connections.get(this.selectedConnectionId);

    if (!connection) {
      throw new Error("Connection not found.");
    }

    connection.send(payload);
  };

  #resetPeer() {
    this.session = null;
    this.connections = new Map();
    this.selectedConnectionId = null;
    this.#updatePeerIdUI("");
    this.#updateConnectionsListUI();
    elements.formPeerConnect.reset();
    elements.formSendPayload.reset();
  }

  #validatePeerId(peerId) {
    if (!peerId.trim()) {
      throw new Error("Peer ID must be valid.");
    }

    if (!this.session) {
      throw new Error("Session not started.");
    }

    if (this.session.id === peerId) {
      throw new Error("Cannot connect to own peer.");
    }

    if (this.connections.has(peerId)) {
      throw new Error("Connection already established.");
    }
  }

  #validateConnection(connection) {
    // !FIXME: cannot validate connection
    // if (!connection?.open) {
    //   throw new Error("Connection cannot be established.");
    // }
  }

  #updatePeerIdUI(id) {
    elements.peerId.innerText = `ID: ${id}`;
  }

  #updateConnectionsListUI() {
    const connectionList = Array.from(this.connections.keys())
      .map(
        (peerId) =>
          `<li class="p-2 cursor-pointer hover:bg-teal-400 bg-teal-200 rounded-md">${peerId}</li>`
      )
      .join("");

    elements.peerConnections.innerHTML = `<ul class="space-y-1">${connectionList}</ul>`;
  }
}

const startSession = async () => {
  try {
    loadingStart();
    peerConnection = new PeerConnection();
    await peerConnection.startSession();

    elements.peerSession.classList.remove("hidden");
    elements.peerWelcome.classList.add("hidden");
  } catch (error) {
    Toastify({ text: error.message }).showToast();
  } finally {
    loadingEnd();
  }
};

const destroySession = () => {
  try {
    peerConnection.destroySession();
    elements.peerSession.classList.add("hidden");
    elements.peerWelcome.classList.remove("hidden");
  } catch (error) {
    Toastify({ text: error.message }).showToast();
  }
};

const copySessionId = async () => {
  try {
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
  } catch (error) {
    Toastify({ text: error.message }).showToast();
  }
};

const connect = async (event) => {
  event.preventDefault();

  try {
    loadingStart();

    const formData = new FormData(event.target);
    const peerId = formData.get("peer-connect-id");
    await peerConnection.connect(peerId);

    Toastify({
      text: "Connection established",
    }).showToast();
  } catch (error) {
    Toastify({ text: error.message }).showToast();
  } finally {
    event.target.reset();
    loadingEnd();
  }
};

const sendPayload = (event) => {
  event.preventDefault();

  try {
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

    event.target.reset();
    Toastify({ text: "Payload sent" }).showToast();
  } catch (error) {
    Toastify({ text: error.message }).showToast();
  }
};
