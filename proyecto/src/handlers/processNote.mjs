import * as libreria from "../auxFunctions.mjs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key",
  "Access-Control-Allow-Methods": "POST,OPTIONS"
};

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ message: `Método no permitido: ${event.httpMethod}` })
    };
  }

  const noteId = event.pathParameters?.noteId;
  if (!noteId) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Falta noteId" })
    };
  }

  let userId;
  try {
    userId = event.requestContext.authorizer.claims.sub;
  } catch {
    userId = "testuser";
  }

  try {
    const notes = await libreria.getNotesByUser(userId);
    const note = notes.find(n => n.noteId === noteId);
    if (!note) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ message: "Nota no encontrada" })
      };
    }

    const mp3Buffer = await libreria.textToSpeech(note.content);
    const audioKey = `audio-${noteId}-${Date.now()}.mp3`;
    const audioUrl = await libreria.uploadToS3(mp3Buffer, audioKey);
    const translation = await libreria.translateNote(note.content, "en");
    await libreria.updateNote(userId, noteId, note.timestamp, { translation });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ noteId, audioUrl, translation })
    };
  } catch (err) {
    console.error("Error:", err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ message: err.message })
    };
  }
};