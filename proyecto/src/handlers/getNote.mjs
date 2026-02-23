// Librería de funciones auxiliares
import * as libreria from "../auxFunctions.mjs";

// Handler
export const handler = async (event) => {
  if (event.httpMethod !== "GET") {
    throw new Error(`Esta función solo admite peticiones de tipo GET. Has usado: ${event.httpMethod}`);
  }

  console.info("Petición recibida:", event);

  // Usuario autenticado
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

  const noteId = event.pathParameters.noteId;
  var response;

  try {
    // MOCK LOCAL para pruebas (quitar en producción)
    let notes;
    if (!process.env.AWS_REGION) {
      notes = [
        { noteId: "nota123", title: "Nota de prueba", content: "Contenido de prueba", timestamp: Date.now() }
      ];
    } else {
      notes = await libreria.getNotesByUser(userId);
    }

    const note = notes.find(n => n.noteId === noteId);

    response = {
      statusCode: note ? 200 : 404,
      body: JSON.stringify(note || { message: "Nota no encontrada" }),
    };
  } catch (err) {
    console.error("Error:", err);
    response = { statusCode: 400, body: JSON.stringify({ message: "Ha habido un problema" }) };
  }

  console.info(
    `Petición a ruta: ${event.path}; código de estado: ${response.statusCode}; datos devueltos: ${response.body}; usuario logueado: ${userId}`
  );

  return response;
};