const db = require("../config/firebase");

const getReport = async (request, h) => {
  const { credentials } = request.auth;

  try {
    const snapshot = await db.collection("comments").get();
    const comments = [];
    snapshot.forEach((doc) => {
      comments.push({ id: doc.id, ...doc.data() });
    });

    return h
      .response({ comments, total: comments.length, token: credentials.token })
      .code(200);
  } catch (error) {
    console.error("Error fetching report:", error);
    return h.response({ error: error.message }).code(500);
  }
};

module.exports = { getReport };
