// Librería de funciones auxiliares
const libreria = require("../auxFunctions");

// Handler
const handler = async (event) => {
  // TODO: reemplazar METODO por método apropiado (PUT, POST, GET,...)
  if (event.httpMethod !== "METODO") {
    throw new Error(
      `Esta función solo admite peticiones de tipo MÉTODO. El método que has usado es: ${event.httpMethod}`,
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

  var noteData = JSON.parse(event.body);
  // TODO: Obtener campos del cuerpo de la petición en caso de ser necesario

  var response;

  try {
    // TODO: Llamar a la función de la librería encargada de realizar el procesamiento o los procesamientos necesarios
    response = {
      // TODO: cambiar y añadir campos necesarios
      statusCode: CODIGO_A_DEVOLVER,
    };
  } catch (err) {
    console.log("Error", err);
    var errorMessage = { message: "Ha habido un problema" };
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
