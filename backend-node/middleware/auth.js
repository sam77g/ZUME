const jwt = require("jsonwebtoken");

function autenticar(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ ok: false, msg: "Não autorizado" });
  }
  try {
    const payload = jwt.verify(auth.split(" ")[1], process.env.JWT_SECRET);
    req.usuario = payload; // { id, nome }
    next();
  } catch {
    return res.status(401).json({ ok: false, msg: "Token inválido ou expirado. Faça login novamente." });
  }
}

module.exports = { autenticar };
