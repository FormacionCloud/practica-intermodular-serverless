// Librería de funciones auxiliares
const libreria = require("../auxFunctions");

// Handler
const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    throw new Error(
      `Esta función solo admite peticiones POST. El método que has usado es: ${event.httpMethod}`,
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
  var noteId = noteData.noteId;
  var noteText = noteData.text;

  var response;

  try {
    var data = await libreria.postNoteForUser(userId, noteId, noteText),
      response = {
        statusCode: 201,
      };
  } catch (err) {
    console.log("Error", err);
    var errorMessage = { message: "Ha habido un problema al crear la nota" };
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
