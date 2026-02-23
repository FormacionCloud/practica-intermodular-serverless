// Librería de funciones auxiliares
import * as libreria from "../auxFunctions.mjs";

// Integraremos la función lambda en modo Proxy con API Gateway
// https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
// Por ello, el evento tendrá el formato descrito en la documentación:
// https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format

// Handler
export const handler = async (event) => {
  // Si no se recibe el método GET, se genera un error
  if (event.httpMethod !== "GET") {
    throw new Error(
      `Esta función solo admite peticiones GET. El método que has usado es: ${event.httpMethod}`,
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

  var response;

    // Obtenemos los datos de la nota. Vendrán en el "body" de la petición POST
    const noteId = event.pathParameters?.noteId;
    console.log("NoteID obtenido como parametro:", noteId);

  if (!noteId) {
     return {
      statusCode: 400,
      body: JSON.stringify({ error: "Falta parámetro noteId" })
    };
    
  }


  try {
    // Llamamos a la función de la librería encargada de devolver las notas de un usuario
    var item = await libreria.getNoteById(userId, noteId);

    // Si la consulta no genera error, devolvemos el listado de elementos y código 200
    // Resultado que devuelve la función, de acuerdo con el formato descrito en la documentación:
    // https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format

    console.log("Item obtenido en handler:", item);

    if (item == null) {
      response = {
      statusCode: 404,
      body: JSON.stringify(item),
    };
    }

    response = {
      statusCode: 200,
      body: JSON.stringify(item),
    };
  } catch (err) {
    console.log("Error", err);
    // Si la consulta genera error, devolvemos una descripción del error y código 400, con el mismo formato
    var errorMessage = { message: "Ha habido un problema al leer la nota" };
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
