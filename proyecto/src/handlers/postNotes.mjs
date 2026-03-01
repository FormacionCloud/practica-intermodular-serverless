// Librería de funciones auxiliares
import * as libreria from "../auxFunctions.mjs";

// Encabezados CORS (añadidos)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key",
  "Access-Control-Allow-Methods": "POST,OPTIONS"
};

export const handler = async (event) => {
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
var noteTitle = noteData.title;           // <-- Cambiado: antes no se extraía
var noteContent = noteData.content;       // <-- Cambiado: antes era noteData.text
var timestamp = Date.now();                // <-- Cambiado: se añade timestamp

  var response;

  try {
    var data = await libreria.postNoteForUser(userId, noteId, noteTitle, noteContent, timestamp); // Solo pasa 3 argumentos (falta título y timestamp)
    response = {
      statusCode: 201,
      headers: corsHeaders,
      body: JSON.stringify(data),
    };
  } catch (err) {
    console.log("Error", err);
    var errorMessage = { message: "Ha habido un problema al crear la nota" };
    response = {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify(errorMessage),
    };
  }

  console.info(
    `Petición a ruta: ${event.path}; código de estado: ${response.statusCode}; usuario logueado: ${userId}`,
  );

  return response;
};