import { parseRequest } from "./requestParser.js";
import { handleRequest } from "./requestHandler.js";
import ErrorHandler from "./errResponse.js";
import { Buffer } from "buffer";

export function createConnectionHandler(maya, isBodyParse) {
  return async function handleConnection(socket) {
    let buffer = Buffer.alloc(0);
    socket.on("data", async (data) => {
      let parsedRequest;
      if (isBodyParse) {
        buffer = Buffer.concat([buffer, data]);
        if (buffer.includes(Buffer.from("\r\n\r\n"))) {
          parsedRequest = await parseRequest(buffer);
          buffer = Buffer.alloc(0);
        } else {
          return;
        }
      } else {
        parsedRequest = parseRequestWithoutBody(data);
      }
      if (parsedRequest.error) {
        return parsedRequestError(socket, parsedRequest.error);
      }

      const { compiledMiddlewares, compiledRoutes, ResponseHandler } = maya;

      for (const [pathPrefix, middleware] of compiledMiddlewares) {
        if (pathPrefix === "/" || parsedRequest.path.startsWith(pathPrefix)) {
          const res = await middleware(
            parsedRequest,
            ResponseHandler,
            () => {}
          );
          if (res) {
            socket.write(res);
            socket.end();
            return;
          }
        }
      }

      const routeHandler = maya.compiledRoutes[parsedRequest.method]?.find(([path]) =>
        parsedRequest.path.startsWith(path)
      )?.[1];

      handleRequest(parsedRequest, compiledRoutes, maya.middlewares)
        .then((responseData) => {
          socket.write(responseData || ErrorHandler.internalServerError());
          socket.end();
        })
        .catch((err) => {
          console.error("Error handling request:", err);
          socket.write(ErrorHandler.internalServerError());
          socket.end();
        });
    });

    socket.on("error", (e) => {
      console.log("error on socket: ", e);
    });
  };
}

function parseRequestWithoutBody(data) {
  const requestLine = data.toString().split("\r\n")[0];
  const [method, path] = requestLine.split(" ");
  return {
    method,
    path,
    headers: {},
  };
}

function parsedRequestError(socket, error) {
  console.error("Request parsing error:", error);
  socket.write(ErrorHandler.badRequest(error));
  socket.end();
}
