// Librería de funciones auxiliares
import * as libreria from "../auxFunctions.mjs";

// Integraremos la función lambda en modo Proxy con API Gateway
// https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
// Por ello, el evento tendrá el formato descrito en la documentación:
// https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format

// Handler
export const handler = async (event) => {
  // TODO: reemplazar METODO por método apropiado (PUT, POST, GET,...)
  if (event.httpMethod !== "POST") {
    throw new Error(
      `Esta función solo admite peticiones de tipo POST. El método que has usado es: ${event.httpMethod}`,
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

    userId = userClaims.sub;
    email = userClaims.email;
    username = userClaims["cognito:username"];
  } catch (error) {
    // Si Cognito no está conectado, la información de autenticación no le será pasada
    // a la función. En este caso utilizaremos un usuario fijo de test, "testuser"
    userId = "testuser";
    email = "test@test.com";
    username = "testuser";
  }

const { noteId } = JSON.parse(event.body || "{}");

if (!noteId) {
  return {
    statusCode: 400,
    body: JSON.stringify({ message: "noteId es obligatorio" }),
  };
}

try {
  const url = await libreria.processNote(userId, noteId);

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Nota procesada correctamente",
      url: url,
    }),
  };

} catch (err) {
  console.log("Error", err);

  return {
    statusCode: 400,
    body: JSON.stringify({ message: "Error procesando la nota" }),
  };
}

  console.info(
    `Petición a ruta: ${event.path}; código de estado: ${response.statusCode}; datos devueltos: ${response.body}; usuario logueado: ${userId}`,
  );

  return response;
};
