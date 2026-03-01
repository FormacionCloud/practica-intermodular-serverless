import * as libreria from "../auxFunctions.mjs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key",
  "Access-Control-Allow-Methods": "PUT,OPTIONS"
};

export const handler = async (event) => {
  if (event.httpMethod !== "PUT") {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ message: `Método no permitido. Usaste: ${event.httpMethod}` })
    };
  }

  console.info("Petición recibida:", event);

  const noteId = event.pathParameters?.noteId;
  if (!noteId) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Falta el parámetro noteId en la URL" })
    };
  }

  let userId;
  try {
    userId = event.requestContext.authorizer.claims.sub;
  } catch {
    userId = "testuser";
  }

  let title, content, timestamp;
  try {
    const body = JSON.parse(event.body);
    title = body.title;
    content = body.content;   // <-- Usa content (correcto)
    timestamp = body.timestamp || Date.now();
    if (!title || !content) {
      throw new Error("Faltan campos obligatorios (title, content)");
    }
  } catch (err) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Cuerpo de petición inválido o incompleto" })
    };
  }

  try {
    const note = await libreria.postNoteForUser(userId, noteId, title, content, timestamp);
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(note)
    };
  } catch (err) {
    console.error("Error en putNote:", err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Error al guardar la nota" })
    };
  }
};