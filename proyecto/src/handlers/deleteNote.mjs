import * as libreria from "../auxFunctions.mjs";

export const handler = async (event) => {

  if (event.httpMethod !== "DELETE") {
    throw new Error(
      `Esta función solo admite peticiones DELETE. El método que has usado es: ${event.httpMethod}`,
    );
  }

  console.info("Petición recibida:", event);

  var userId, email, username;

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

  var response;

  try {
    await libreria.deleteNote(userId, noteId);

    response = {
      statusCode: 200,
      body: JSON.stringify({ message: "Nota eliminada correctamente" }),
    };

  } catch (err) {
    console.log("Error", err);

    response = {
      statusCode: 400,
      body: JSON.stringify({ message: "Ha habido un problema" }),
    };
  }

  console.info(
    `Petición a ruta: ${event.path}; código de estado: ${response.statusCode}; usuario logueado: ${userId}`,
  );

  return response;
};