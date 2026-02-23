// Librería de funciones auxiliares
import * as libreria from "../auxFunctions.mjs";

// Handler
export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    throw new Error(`Esta función solo admite peticiones de tipo POST. Has usado: ${event.httpMethod}`);
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
  const { noteId } = noteData;

  var response;
  try {
    let note, mp3Buffer, audioUrl, translation;

    // MOCK LOCAL para pruebas (quitar en producción)
    if (!process.env.AWS_REGION) {
      note = { noteId, content: "Contenido de prueba" };
      mp3Buffer = Buffer.from("fake audio");
      audioUrl = `audio-${noteId}-fake.mp3`;
      translation = "Test translation";
    } else {
      const notes = await libreria.getNotesByUser(userId);
      note = notes.find(n => n.noteId === noteId);
      if (!note) throw new Error("Nota no encontrada");

      mp3Buffer = await libreria.textToSpeech(note.content);
      const audioKey = `audio-${noteId}-${Date.now()}.mp3`;
      audioUrl = await libreria.uploadToS3(mp3Buffer, audioKey);

      translation = await libreria.translateNote(note.content, "en");
      await libreria.updateNote(userId, noteId, note.timestamp, { translation });
    }

    response = {
      statusCode: 200,
      body: JSON.stringify({ noteId, audioUrl, translation }),
    };
  } catch (err) {
    console.error("Error:", err);
    response = { statusCode: 400, body: JSON.stringify({ message: err.message }) };
  }

  console.info(
    `Petición a ruta: ${event.path}; código de estado: ${response.statusCode}; datos devueltos: ${response.body}; usuario logueado: ${userId}`
  );

  return response;
};