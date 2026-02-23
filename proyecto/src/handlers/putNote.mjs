// Librería de funciones auxiliares
import * as libreria from "../auxFunctions.mjs";

// Handler
export const handler = async (event) => {
  if (event.httpMethod !== "PUT") {
    throw new Error(`Esta función solo admite peticiones de tipo PUT. Has usado: ${event.httpMethod}`);
  }

  console.info("Petición recibida:", event);

  var userId, email, username;
  try {
    const userClaims = event.requestContext.authorizer.claims;
    userId = userClaims.sub;
    email = userClaims.email;
    username = userClaims["cognito:username"];
  } catch {
    userId = "testuser";
    email = "test@test.com";
    username = "testuser";
  }

  const noteData = JSON.parse(event.body);
  const { noteId, title, content, timestamp } = noteData;
  const ts = timestamp || Date.now();

  var response;
  try {
    // MOCK LOCAL para pruebas (quitar en producción)
    let note;
    if (!process.env.AWS_REGION) {
      note = { noteId, title, content, timestamp: ts };
    } else {
      note = await libreria.postNoteForUser(userId, noteId, title, content, ts);
    }

    response = { statusCode: 200, body: JSON.stringify(note) };
  } catch (err) {
    console.error("Error:", err);
    response = { statusCode: 400, body: JSON.stringify({ message: "Ha habido un problema" }) };
  }

  console.info(
    `Petición a ruta: ${event.path}; código de estado: ${response.statusCode}; datos devueltos: ${response.body}; usuario logueado: ${userId}`
  );

  return response;
};