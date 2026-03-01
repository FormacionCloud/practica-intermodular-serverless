import * as libreria from "../auxFunctions.mjs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key",
  "Access-Control-Allow-Methods": "DELETE,OPTIONS"
};

export const handler = async (event) => {
  if (event.httpMethod !== "DELETE") {
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
    await libreria.deleteNote(userId, noteId);
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Nota eliminada" })
    };
  } catch (err) {
    console.error("Error:", err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Error al eliminar" })
    };
  }
};