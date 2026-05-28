// Librería de funciones auxiliares
import * as libreria from "../auxFunctions.mjs";

// Handler
export const handler = async (event) => {

  // Manejar preflight CORS
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "*",
      },
      body: "",
    };
  }

  // Solo admitimos POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        message: `Esta función solo admite POST. Método usado: ${event.httpMethod}`,
      }),
    };
  }

  // Log en CloudWatch
  console.info("Petición recibida:", event);

  // Obtener usuario autenticado o usar testuser
  let userId, email, username;

  try {

    const userClaims = event.requestContext.authorizer.claims;

    userId = userClaims.sub;
    email = userClaims.email;
    username = userClaims["cognito:username"];

  } catch (error) {

    userId = "testuser";
    email = "test@test.com";
    username = "testuser";
  }

  let response;

  try {

    // Obtener datos del body
    const noteData = JSON.parse(event.body);

    const { noteId, text } = noteData;

    // Crear nota
    await libreria.postNote(userId, noteId, text);

    response = {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        message: `Nota ${noteId} creada correctamente para el usuario ${userId}`,
      }),
    };

  } catch (err) {

    console.log("Error", err);

    response = {
      statusCode: 400,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        message: "Ha habido un problema al crear la nota",
      }),
    };
  }

  console.info(
    `Petición a ruta: ${event.path}; código de estado: ${response.statusCode}; usuario logueado: ${userId}`,
  );

  return response;
};