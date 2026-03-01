import * as libreria from "../auxFunctions.mjs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key",
  "Access-Control-Allow-Methods": "GET,OPTIONS"
};

export const handler = async (event) => {
  if (event.httpMethod !== "GET") {
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
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(note)
    };
  } catch (err) {
    console.error("Error:", err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Error interno" })
    };
  }
};