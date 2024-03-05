import { injectable, /* inject, */ BindingScope } from '@loopback/core';
import { Credenciales, FactorDeAutenticacionPorCodigo, Login, Usuario } from '../models';
import { repository } from '@loopback/repository';
import { LoginRepository, UsuarioRepository } from '../repositories';
import { promises } from 'dns';
import { ConfiguracionSeguridad } from '../config/seguridad.config';
const generator = require('generate-password');
const MD5 = require('crypto-js/md5');
const jwt = require('jsonwebtoken');
@injectable({ scope: BindingScope.TRANSIENT })
export class SeguridadUsuarioService {
  constructor(
    @repository(UsuarioRepository)
    public repositorioUsuario: UsuarioRepository,
    @repository(LoginRepository)
    public repositorioLogin: LoginRepository
  ) { }

  /*
   * crear una clave aleatoria
   */
  crearTextoAleatoreo(n: number): string {
    let clave = generator.generate({
      length: n,
      numbers: true
    });

    return clave;
  }
  /**texto a cifrado 
   * @returns cadena cifrada md5
   */
  cifrarTexto(cadena: string): string {
    let cadenaCifrada = MD5(cadena).toString();
    return cadenaCifrada;
  }
  /**
   * se busca un usuario por sus credenciales de acceso
   * @param credenciales credenciales del usuario
   * @returns usuario encontrado o null
   */

  async indentificarUsuario(credenciales: Credenciales): Promise<Usuario | null> {
    let usuario = await this.repositorioUsuario.findOne({ where: { correo: credenciales.correo, clave: credenciales.clave } });
    return usuario as Usuario;
  }
  /**
   * valida el codigo 2fa del usuario
   * @param credenciales2fa credenciales del usuario con el codigo 2fa
   * @returns el registro de login o null
   */
  async validarCodigo2fa(credenciales2fa: FactorDeAutenticacionPorCodigo): Promise<Usuario | null> {
    let login = await this.repositorioLogin.findOne({
      where: {
        usuarioId: credenciales2fa.usuarioId,
        codigo2fa: credenciales2fa.codigo2fa,
        estadoCodigo2fa: false

      }
    });
    if (login) {
      let usuario = await this.repositorioUsuario.findById(credenciales2fa.usuarioId);
      if (usuario) {
        await this.repositorioLogin.update(login);
        return usuario;
      }
    }
    return null;
  }
  /**
   * genera un token para el usuario
   * @parama usuario para generar el token
   */
  crearToken(usuario: Usuario): string {
    let datos = {
      name: `${usuario.primerNombre} ${usuario.segundoNombre} ${usuario.primerApellido} ${usuario.segundoApellido}`,
      role: usuario.rolId,
      email: usuario.correo
    };
    let token = jwt.sign(datos, ConfiguracionSeguridad.claveJWT);
    return token;
  }
}
