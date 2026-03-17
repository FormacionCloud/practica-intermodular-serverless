// Librería de funciones auxiliares
import * as libreria from "../auxFunctions.mjs";

// Integraremos la función lambda en modo Proxy con API Gateway
// https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
// Por ello, el evento tendrá el formato descrito en la documentación:
// https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format

// Handler
export const handler = async (event) => {
  // TODO: reemplazar METODO por método apropiado (PUT, POST, GET,...)
  if (event.httpMethod !== "DELETE") {
    throw new Error(
      `Esta función solo admite peticiones de tipo DELETE. El método que has usado es: ${event.httpMethod}`,
    );
  }

  // Log en CloudWatch
  console.info("Petición recibida:", event);

  // Obtenemos el usuario autenticado. Esta información la proporcionará el servicio
  // Cognito una vez lo hayamos conectado
  // Si no tenemos Cognito conectado, lo que haremos será definir un usuario
  // de ejemplo, llamado "testuser". Así, durante la fase de desarrollo, todas
  // las notas estarán referenciadas a este usuario de test
  var userId, email, username;
  try {
    const userClaims = event.requestContext.authorizer.claims;

    userId = userClaims.sub || userClaims.userId;
    email = userClaims.email;
    username = userClaims["cognito:username"];
  } catch (error) {
    // Si Cognito no está conectado, la información de autenticación no le será pasada
    // a la función. En este caso utilizaremos un usuario fijo de test, "testuser"
    userId = "testuser";
    email = "test@test.com";
    username = "testuser";
  }

  
  // TODO: Obtener campos del cuerpo de la petición en caso de ser necesario
  let noteId;
  if (event.body) {
    const noteData = JSON.parse(event.body); // Convertimos de JSON a objeto javascript
    noteId = noteData.noteId;
  } else {
    throw new Error("El body no contiene noteId");
  }

  if (!noteId) {
  throw new Error("noteId es obligatorio");
  }

  console.log("userId:", userId);
  console.log("noteId:", noteId);
  
  var response;
  try {
    // TODO: Llamar a la función de la librería encargada de realizar el procesamiento o los procesamientos necesarios
    await libreria.deleteNote(userId, noteId);
    // Resultado que devuelve la función, de acuerdo con el formato descrito en la documentación:
    // https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
    response = {
      // TODO: cambiar y añadir campos necesarios
      statusCode: 200,
      body: JSON.stringify({ message: "Nota eliminada correctamente" }),      
    };
  } catch (err) {
    console.log("Error al borrar nota", err);
    // Si la consulta genera error, devolvemos una descripción del error y código 400, con el mismo formato
    var errorMessage = { message: "No se pudo eliminar la nota" };
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
