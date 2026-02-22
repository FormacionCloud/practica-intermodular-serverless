// Librería de funciones auxiliares
import * as libreria from "../auxFunctions.mjs";

// Handler
export const handler = async (event) => {
  // Solo admitimos POST para crear una nota
  if (event.httpMethod !== "POST") {
    throw new Error(
      `Esta función solo admite peticiones de tipo POST. El método que has usado es: ${event.httpMethod}`,
    );
  }

  // Log en CloudWatch
  console.info("Petición recibida:", event);

  // Obtener usuario autenticado (Cognito) o usar testuser
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

  // Obtener datos de la nota del cuerpo de la petición
  var noteData = JSON.parse(event.body);
  const { noteId, text } = noteData; // Debemos recibir estos campos

  var response;

  try {
    // Llamamos a la función de la librería que crea la nota
    await libreria.postNote(userId, noteId, text);

    // Devolvemos confirmación
    response = {
      statusCode: 200,
      body: JSON.stringify({
        message: `Nota ${noteId} creada correctamente para el usuario ${userId}`,
      }),
    };
  } catch (err) {
    console.log("Error", err);

    response = {
      statusCode: 400,
      body: JSON.stringify({ message: "Ha habido un problema al crear la nota" }),
    };
  }

  console.info(
    `Petición a ruta: ${event.path}; código de estado: ${response.statusCode}; usuario logueado: ${userId}`,
  );

  return response;
};