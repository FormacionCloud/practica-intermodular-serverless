import * as libreria from "../auxFunctions.mjs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key",
  "Access-Control-Allow-Methods": "GET,OPTIONS"
};

export const handler = async (event) => {
  if (event.httpMethod !== "GET") {
    throw new Error(`Esta función solo admite GET. Método usado: ${event.httpMethod}`);
  }

  console.info("Petición recibida:", event);

  var userId;
  try {
    userId = event.requestContext.authorizer.claims.sub;
  } catch {
    userId = "testuser";
  }

  try {
    var items = await libreria.getNotesByUser(userId);
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(items),
    };
  } catch (err) {
    console.log("Error", err);
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Error al leer las notas" }),
    };
  }
};