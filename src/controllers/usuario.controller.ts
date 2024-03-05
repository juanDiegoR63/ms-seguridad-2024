import {
  Count,
  CountSchema,
  Filter,
  FilterExcludingWhere,
  repository,
  Where,
} from '@loopback/repository';
import {
  post,
  param,
  get,
  getModelSchemaRef,
  patch,
  put,
  del,
  requestBody,
  response,
  HttpErrors,
} from '@loopback/rest';
import { Credenciales, FactorDeAutenticacionPorCodigo, Login, Usuario } from '../models';
import { LoginRepository, UsuarioRepository } from '../repositories';
import { service } from '@loopback/core';
import { SeguridadUsuarioService } from '../services';
import { promises } from 'dns';
import { httpGetAsync } from '@loopback/testlab';

export class UsuarioController {
  constructor(
    @repository(UsuarioRepository)
    public usuarioRepository: UsuarioRepository,
    @service(SeguridadUsuarioService)
    public servicioSeguridad: SeguridadUsuarioService,
    @repository(LoginRepository)
    public repositorioLogin: LoginRepository
  ) { }

  @post('/usuario')
  @response(200, {
    description: 'Usuario model instance',
    content: { 'application/json': { schema: getModelSchemaRef(Usuario) } },
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Usuario, {
            title: 'NewUsuario',
            exclude: ['_id'],
          }),
        },
      },
    })
    usuario: Omit<Usuario, '_id'>,
  ): Promise<Usuario> {
    // crear clave de usuario
    let clave = this.servicioSeguridad.crearTextoAleatoreo(10);
    // cifrar clave
    let claveCifrada = this.servicioSeguridad.cifrarTexto(clave);
    // asignar clave cifrada al usuario
    usuario.clave = claveCifrada;
    // enviar correo electronico de notificacion
    return this.usuarioRepository.create(usuario);
  }

  @get('/usuario/count')
  @response(200, {
    description: 'Usuario model count',
    content: { 'application/json': { schema: CountSchema } },
  })
  async count(
    @param.where(Usuario) where?: Where<Usuario>,
  ): Promise<Count> {
    return this.usuarioRepository.count(where);
  }

  @get('/usuario')
  @response(200, {
    description: 'Array of Usuario model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(Usuario, { includeRelations: true }),
        },
      },
    },
  })
  async find(
    @param.filter(Usuario) filter?: Filter<Usuario>,
  ): Promise<Usuario[]> {
    return this.usuarioRepository.find(filter);
  }

  @patch('/usuario')
  @response(200, {
    description: 'Usuario PATCH success count',
    content: { 'application/json': { schema: CountSchema } },
  })
  async updateAll(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Usuario, { partial: true }),
        },
      },
    })
    usuario: Usuario,
    @param.where(Usuario) where?: Where<Usuario>,
  ): Promise<Count> {
    return this.usuarioRepository.updateAll(usuario, where);
  }

  @get('/usuario/{id}')
  @response(200, {
    description: 'Usuario model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Usuario, { includeRelations: true }),
      },
    },
  })
  async findById(
    @param.path.string('id') id: string,
    @param.filter(Usuario, { exclude: 'where' }) filter?: FilterExcludingWhere<Usuario>
  ): Promise<Usuario> {
    return this.usuarioRepository.findById(id, filter);
  }

  @patch('/usuario/{id}')
  @response(204, {
    description: 'Usuario PATCH success',
  })
  async updateById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Usuario, { partial: true }),
        },
      },
    })
    usuario: Usuario,
  ): Promise<void> {
    await this.usuarioRepository.updateById(id, usuario);
  }

  @put('/usuario/{id}')
  @response(204, {
    description: 'Usuario PUT success',
  })
  async replaceById(
    @param.path.string('id') id: string,
    @requestBody() usuario: Usuario,
  ): Promise<void> {
    await this.usuarioRepository.replaceById(id, usuario);
  }

  @del('/usuario/{id}')
  @response(204, {
    description: 'Usuario DELETE success',
  })
  async deleteById(@param.path.string('id') id: string): Promise<void> {
    await this.usuarioRepository.deleteById(id);
  }

  /**
   * metodos personalizados parar la API
   */

  @post('/identificar-usuario')
  @response(200, {
    description: 'identificar un usuario por correo y clave',
    content: { 'application/json': { schema: getModelSchemaRef(Usuario) } },
  })
  async identificarUsuario(
    // implementar logica para identificar un usuario
    @requestBody(
      {
        content: {
          'application/json': {
            schema: getModelSchemaRef(Credenciales)
          }
        }
      }
    )
    credenciales: Credenciales
  ): Promise<object> {
    let usuario = await this.servicioSeguridad.indentificarUsuario(credenciales);
    if (usuario) {
      let codigo2fa = this.servicioSeguridad.crearTextoAleatoreo(5);
      let login:Login = new Login();
      login.usuarioId = usuario._id!;
      login.codigo2fa = codigo2fa;
      login.estadoCodigo2fa = false;
      login.token = '';
      login.estadoToken = false;
      this.repositorioLogin.create(login);
      // notificar al usuario via correo o sms
      return usuario
    }
    return new HttpErrors[401]('Las credenciales no son validas.');
  }

  @post('/verificar-2fa')
  @response(200, {
    description: 'validar un codigo de 2fa'
    
  })
  async VerificarCodigo2fa(
    // implementar logica para identificar un usuario
    @requestBody(
      {
        content: {
          'application/json': {
            schema: getModelSchemaRef(FactorDeAutenticacionPorCodigo)
          }
        }
      }
    )
    credenciales: FactorDeAutenticacionPorCodigo
  ): Promise<object> {
    let usuario = await this.servicioSeguridad.validarCodigo2fa(credenciales);
    let token = 
  if(usuario){
    return {
      user:{

      },
      token: ''
    };
  }
  return new HttpErrors[401]('Codigo de 2fa para el usuario no es valido.');
  }
}
