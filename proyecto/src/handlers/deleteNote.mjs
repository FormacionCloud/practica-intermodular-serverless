// Librería de funciones auxiliares
import * as libreria from "../auxFunctions.mjs";

// Encabezados CORS
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key"
};

// Handler
export const handler = async (event) => {
  if (event.httpMethod !== "DELETE") {
    return {
      statusCode: 405, // Método no permitido
      headers: corsHeaders,
      body: JSON.stringify({ message: `Esta función solo admite peticiones de tipo DELETE. Has usado: ${event.httpMethod}` })
    };
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

  const noteData = JSON.parse(event.body);
  const { noteId, timestamp } = noteData;

  var response;
  try {
    // MOCK LOCAL para pruebas (quitar en producción)
    let result;
    if (!process.env.AWS_REGION) {
      result = { message: `Nota ${noteId} borrada correctamente` };
    } else {
      result = await libreria.deleteNote(userId, noteId, timestamp);
    }

    response = {
      statusCode: 200,
      headers: corsHeaders, // <--- AÑADIDO
      body: JSON.stringify(result)
    };
  } catch (err) {
    console.error("Error:", err);
    response = {
      statusCode: 400,
      headers: corsHeaders, // <--- AÑADIDO
      body: JSON.stringify({ message: "Ha habido un problema" })
    };
  }

  console.info(
    `Petición a ruta: ${event.path}; código de estado: ${response.statusCode}; datos devueltos: ${response.body}; usuario logueado: ${userId}`
  );

  return response;
};