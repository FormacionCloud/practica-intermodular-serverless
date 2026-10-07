// Librería de funciones auxiliares
const libreria = require("../auxFunctions");

// Handler
const handler = async (event) => {
  if (event.httpMethod !== "GET") {
    throw new Error(
      `Esta función solo admite peticiones GET. El método que has usado es: ${event.httpMethod}`,
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

  var response;

  try {
    var items = await libreria.getNotesByUser(userId);
    response = {
      statusCode: 200,
      body: JSON.stringify(items),
    };
  } catch (err) {
    console.log("Error", err);
    var errorMessage = { message: "Ha habido un problema al leer las notas" };
    response = {
      statusCode: 400,
      body: JSON.stringify(errorMessage),
    };
  }

  console.info(
    `Petición a ruta: ${event.path}; código de estado: ${response.statusCode}; datos devueltos: ${response.body}; usuario logueado: ${userId}`,
  );

  return response;
};

module.exports = { handler };
