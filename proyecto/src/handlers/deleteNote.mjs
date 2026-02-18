// Librería de funciones auxiliares
import * as libreria from "../auxFunctions.mjs";

// Integraremos la función lambda en modo Proxy con API Gateway
// https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
// Por ello, el evento tendrá el formato descrito en la documentación:
// https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format

// Handler
export const handler = async (event) => {
    if (event.httpMethod !== "DELETE") {
        throw new Error(
            `Esta función solo admite peticiones DELETE. El método que has usado es: ${event.httpMethod}`,
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

    // Obtener el noteId del path
    const noteId = event.pathParameters.id;

    var response;

    try {
        // Llamar a la función de la librería para eliminar la nota
        await libreria.deleteNoteById(userId, noteId);

        response = {
            statusCode: 200,
            body: JSON.stringify({ message: "Nota eliminada correctamente" }),
        };
    } catch (err) {
        console.log("Error", err);
        // Si la consulta genera error, devolvemos una descripción del error y código 400
        var errorMessage = { message: "Ha habido un problema al eliminar la nota" };
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