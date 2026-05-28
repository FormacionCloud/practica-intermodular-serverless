import * as libreria from "../auxFunctions.mjs";

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

  // Validar método HTTP
  if (event.httpMethod !== "DELETE") {
    return {
      statusCode: 405,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        message: `Esta función solo admite DELETE. Método usado: ${event.httpMethod}`,
      }),
    };
  }

  console.info("Petición recibida:", event);

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

  const noteId = event.pathParameters.noteId;

  let response;

  try {

    await libreria.deleteNote(userId, noteId);

    response = {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        message: "Nota eliminada correctamente",
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
        message: "Ha habido un problema",
      }),
    };
  }

  console.info(
    `Petición a ruta: ${event.path}; código de estado: ${response.statusCode}; usuario logueado: ${userId}`,
  );

  return response;
};