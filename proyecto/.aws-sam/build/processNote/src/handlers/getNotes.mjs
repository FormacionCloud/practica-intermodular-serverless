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

  // Validar método HTTP
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        message: `Esta función solo admite GET. Método usado: ${event.httpMethod}`,
      }),
    };
  }

  // Log en CloudWatch
  console.info("Petición recibida:", event);

  // Usuario autenticado
  let userId, email, username;

  try {

    const userClaims = event.requestContext.authorizer.claims;

    userId = userClaims.sub;
    email = userClaims.email;
    username = userClaims["cognito:username"];

  } catch (error) {

    // Usuario de prueba si no hay Cognito
    userId = "testuser";
    email = "test@test.com";
    username = "testuser";
  }

  let response;

  try {

    // Obtener notas
    const items = await libreria.getNotesByUser(userId);

    response = {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(items),
    };

  } catch (err) {

    console.log("Error", err);

    const errorMessage = {
      message: "Ha habido un problema al leer las notas",
    };

    response = {
      statusCode: 400,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(errorMessage),
    };
  }

  console.info(
    `Petición a ruta: ${event.path}; código de estado: ${response.statusCode}; usuario logueado: ${userId}`,
  );

  return response;
};