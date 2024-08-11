import net from 'net'
import { handleRequest } from './requestHandler/requestHandler.js';
import { jsonResponse } from './responseHandler/reshandler.js';
import { parseRequest } from './parser/requestParser.js';
import { errhandler } from './responseHandler/errResponse.js';

class Porny {
  constructor (){
    this.routes = {
      GET: {},
      POST: {},
      PUT: {},
      DELETE: {}
    }
  }

  listen (port = 3000){
    const server = net.createServer((socket) => {
      let buffer = Buffer.alloc(0);
      socket.on('data', (data) => {
        buffer = Buffer.concat([buffer, data]);
        
        if (buffer.includes(Buffer.from('\r\n\r\n'))) {
          const parsedRequest  = parseRequest(buffer)
          const responseData  = handleRequest(parsedRequest,this.routes)
          console.log('resonse data',responseData)
          if (responseData) {
            socket.write(responseData)
          } else {
            socket.write(errhandler())
          }
          buffer = Buffer.alloc(0);
          socket.end()
        }
      });
  
  
      socket.on('error',(e)=>{
          console.log("error on socket: ",e);
      })
    });
  
    server.listen(port, 'localhost',() => {
      console.log(`server is running on port ${port}`);
    });
  }
  
  get(path, handler) {
    this.routes.GET[path] = handler;
  }

  post(path, handler) {
    this.routes.POST[path] = handler;
  }

  put(path, handler) {
    this.routes.PUT[path] = handler;
  }

  delete(path, handler) {
    this.routes.DELETE[path] = handler;
  }

  jsonResponse(data, statusCode = 200, statusMessage = 'OK') {
    return jsonResponse(data, statusCode, statusMessage);
  }
  
}

export default  Porny;

