package cl.duoc.nutrivida.usuarios.service;

import cl.duoc.nutrivida.usuarios.dto.ActualizarUsuarioSolicitud;
import cl.duoc.nutrivida.usuarios.exception.ApiException;
import cl.duoc.nutrivida.usuarios.model.Contador;
import cl.duoc.nutrivida.usuarios.model.Rol;
import cl.duoc.nutrivida.usuarios.model.Usuario;
import cl.duoc.nutrivida.usuarios.repository.ContadorRepository;
import cl.duoc.nutrivida.usuarios.repository.UsuarioRepository;
import cl.duoc.nutrivida.usuarios.security.UsuarioActual;
import cl.duoc.nutrivida.usuarios.security.UsuarioAutenticado;
import java.time.Clock;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Cuentas de usuario. Cada método que revisa una regla y escribe es @Transactional (contrato §5):
 * los duplicados se revisan aquí y el UNIQUE de la base es la última barrera.
 */
@Service
public class UsuarioService {

    private final UsuarioRepository usuarios;
    private final ContadorRepository contadores;
    private final PasswordEncoder codificador;
    private final Clock reloj;
    private final UsuarioActual actual;

    public UsuarioService(UsuarioRepository usuarios, ContadorRepository contadores, PasswordEncoder codificador,
            Clock reloj, UsuarioActual actual) {
        this.usuarios = usuarios;
        this.contadores = contadores;
        this.codificador = codificador;
        this.reloj = reloj;
        this.actual = actual;
    }

    /** Datos ya validados por @Valid; aquí van el RUT, los duplicados y el hash. */
    public record DatosCuenta(String nombre, String apellido, String rut, String correo, String telefono,
            LocalDate fechaNacimiento, String clave, Rol rol, String nutricionistaId, boolean activo) { }

    @Transactional
    public Usuario crear(DatosCuenta d) {
        String rut = ReglasUsuario.normalizarRut(d.rut());
        String correo = ReglasUsuario.normalizarCorreo(d.correo());
        ReglasUsuario.validarNacimiento(d.fechaNacimiento());
        String nutricionistaId = d.rol() == Rol.NUTRICIONISTA ? exigirVinculo(d.nutricionistaId()) : null;
        if (usuarios.existsByCorreo(correo)) throw ApiException.conflicto("correo", "Ya existe un usuario con ese correo.");
        if (usuarios.existsByRut(rut)) throw ApiException.conflicto("rut", "Ya existe un usuario con ese RUT.");
        if (nutricionistaId != null && usuarios.existsByNutricionistaId(nutricionistaId)) {
            throw ApiException.conflicto("nutricionistaId", "Ese nutricionista ya está vinculado a otro usuario.");
        }
        Usuario nuevo = new Usuario(siguienteId(), d.nombre().trim(), d.apellido().trim(), rut, correo,
                ReglasUsuario.normalizarTelefono(d.telefono()), d.fechaNacimiento(), codificador.encode(d.clave()),
                d.rol(), nutricionistaId, d.activo(), LocalDate.now(reloj));
        return usuarios.save(nuevo);
    }

    /** RF-ACC-01: el registro público siempre crea un PACIENTE activo. */
    @Transactional
    public Usuario registrarPaciente(DatosCuenta d) {
        return crear(new DatosCuenta(d.nombre(), d.apellido(), d.rut(), d.correo(), d.telefono(),
                d.fechaNacimiento(), d.clave(), Rol.PACIENTE, null, true));
    }

    @Transactional(readOnly = true)
    public Usuario buscar(String id) {
        return usuarios.findById(id).orElseThrow(() -> ApiException.noEncontrado("El usuario no existe."));
    }

    // ------------------------------------------------------------------ lectura

    /**
     * GET /api/usuarios. Secretaria y admin ven todo; el nutricionista, solo pacientes (los necesita
     * para su agenda y sus fichas). El texto busca en nombre, correo y RUT, sin tildes.
     */
    @Transactional(readOnly = true)
    public List<Usuario> listar(Rol rol, Boolean activo, String texto) {
        UsuarioAutenticado yo = actual.obtener();
        if (yo.tieneRol("NUTRICIONISTA") && rol != Rol.PACIENTE) {
            throw ApiException.prohibido("Solo puedes ver la lista de pacientes.");
        }
        String buscado = ReglasUsuario.sinTildes(texto);
        String rutBuscado = texto == null ? "" : texto.replaceAll("[.\\s-]", "").toUpperCase();
        return usuarios.findAll().stream()
                .filter(u -> rol == null || u.getRol() == rol)
                .filter(u -> activo == null || u.isActivo() == activo)
                .filter(u -> buscado.isEmpty()
                        || ReglasUsuario.sinTildes(u.getNombre() + " " + u.getApellido()).contains(buscado)
                        || u.getCorreo().contains(buscado)
                        || (!rutBuscado.isEmpty() && u.getRut().replaceAll("[.-]", "").contains(rutBuscado)))
                .sorted(Comparator.comparing(Usuario::getId))
                .toList();
    }

    /**
     * GET /api/usuarios/{id}. Cada uno lee su propia cuenta (ms-citas lo usa para ver si sigue
     * activa); secretaria y admin, cualquiera; el nutricionista, solo pacientes.
     */
    @Transactional(readOnly = true)
    public Usuario obtener(String id) {
        UsuarioAutenticado yo = actual.obtener();
        boolean propia = yo.id().equals(id);
        if (!propia && !yo.tieneRol("ADMIN", "SECRETARIA", "NUTRICIONISTA")) {
            throw ApiException.prohibido("Solo puedes ver tu propia cuenta.");
        }
        Usuario u = buscar(id);
        if (!propia && yo.tieneRol("NUTRICIONISTA") && u.getRol() != Rol.PACIENTE) {
            throw ApiException.prohibido("Solo puedes ver cuentas de pacientes.");
        }
        return u;
    }

    // ------------------------------------------------------------------ escritura

    /**
     * PATCH /api/usuarios/{id}. El admin edita cualquier cuenta, menos su propio rol y estado.
     * Los demás roles, solo nombre, apellido y teléfono de su propia cuenta (RF-ACC-05).
     */
    @Transactional
    public Usuario actualizar(String id, ActualizarUsuarioSolicitud c) {
        UsuarioAutenticado yo = actual.obtener();
        if (!yo.tieneRol("ADMIN")) {
            if (!yo.id().equals(id)) throw ApiException.prohibido("Solo puedes editar tu propia cuenta.");
            String campo = c.rut() != null ? "rut" : c.correo() != null ? "correo"
                    : c.fechaNacimiento() != null ? "fechaNacimiento" : c.rol() != null ? "rol"
                    : c.nutricionistaId() != null ? "nutricionistaId" : c.activo() != null ? "activo" : null;
            if (campo != null) throw prohibidoEnCampo(campo, "Ese dato solo lo puede cambiar el administrador.");
        }
        Usuario u = buscar(id);
        protegerCuentaPropia(yo, u, c.rol() == null ? null : Rol.valueOf(c.rol()), c.activo());
        if (c.nombre() != null) u.setNombre(c.nombre().trim());
        if (c.apellido() != null) u.setApellido(c.apellido().trim());
        if (c.telefono() != null) u.setTelefono(ReglasUsuario.normalizarTelefono(c.telefono()));
        if (c.fechaNacimiento() != null) {
            ReglasUsuario.validarNacimiento(c.fechaNacimiento());
            u.setFechaNacimiento(c.fechaNacimiento());
        }
        if (c.correo() != null) {
            String correo = ReglasUsuario.normalizarCorreo(c.correo());
            if (usuarios.existsByCorreoAndIdNot(correo, id)) {
                throw ApiException.conflicto("correo", "Ya existe un usuario con ese correo.");
            }
            u.setCorreo(correo);
        }
        if (c.rut() != null) {
            String rut = ReglasUsuario.normalizarRut(c.rut());
            if (usuarios.existsByRutAndIdNot(rut, id)) throw ApiException.conflicto("rut", "Ya existe un usuario con ese RUT.");
            u.setRut(rut);
        }
        if (c.rol() != null || c.nutricionistaId() != null) {
            aplicarRol(u, c.rol() == null ? u.getRol() : Rol.valueOf(c.rol()),
                    c.nutricionistaId() != null ? c.nutricionistaId() : u.getNutricionistaId());
        }
        if (c.activo() != null) u.setActivo(c.activo());
        return u;
    }

    /** PATCH /api/usuarios/{id}/estado (ADMIN, nunca sobre sí mismo). */
    @Transactional
    public Usuario cambiarEstado(String id, boolean activo) {
        Usuario u = buscar(id);
        protegerCuentaPropia(actual.obtener(), u, null, activo);
        u.setActivo(activo);
        return u;
    }

    /** PATCH /api/usuarios/{id}/rol (ADMIN, nunca sobre sí mismo). */
    @Transactional
    public Usuario cambiarRol(String id, Rol rol, String nutricionistaId) {
        Usuario u = buscar(id);
        protegerCuentaPropia(actual.obtener(), u, rol, null);
        aplicarRol(u, rol, nutricionistaId);
        return u;
    }

    /** PUT /api/usuarios/{id}/clave: cada uno la suya y con la clave actual. */
    @Transactional
    public Usuario cambiarClave(String id, String claveActual, String claveNueva) {
        if (!actual.obtener().id().equals(id)) throw ApiException.prohibido("Solo puedes cambiar tu propia contraseña.");
        Usuario u = buscar(id);
        if (!codificador.matches(claveActual, u.getClave())) {
            throw ApiException.validacion("claveActual", "La contraseña actual no es correcta.");
        }
        if (claveActual.equals(claveNueva)) {
            throw ApiException.validacion("claveNueva", "La nueva contraseña debe ser distinta de la actual.");
        }
        u.setClave(codificador.encode(claveNueva));
        return u;
    }

    /**
     * DELETE /api/usuarios/{id} (ADMIN). Una cuenta con historial se desactiva, no se borra: ms-citas
     * y ms-clinica guardan su id por valor. Por eso solo se elimina una cuenta ya desactivada y nunca
     * la propia (mismo criterio que el DELETE de citas, contrato §6.1).
     */
    @Transactional
    public void eliminar(String id) {
        if (actual.obtener().id().equals(id)) throw ApiException.prohibido("No puedes eliminar tu propia cuenta.");
        Usuario u = buscar(id);
        if (u.isActivo()) throw ApiException.conflicto("Desactiva la cuenta antes de eliminarla.");
        usuarios.delete(u);
    }

    private void aplicarRol(Usuario u, Rol rol, String nutricionistaId) {
        String vinculo = rol == Rol.NUTRICIONISTA ? exigirVinculo(nutricionistaId) : null;
        if (vinculo != null && usuarios.existsByNutricionistaIdAndIdNot(vinculo, u.getId())) {
            throw ApiException.conflicto("nutricionistaId", "Ese nutricionista ya está vinculado a otro usuario.");
        }
        u.cambiarRol(rol, vinculo);
    }

    /** El admin no se quita el acceso a sí mismo: ni se desactiva ni cambia su rol. */
    private static void protegerCuentaPropia(UsuarioAutenticado yo, Usuario u, Rol rol, Boolean activo) {
        if (!yo.id().equals(u.getId())) return;
        if (Boolean.FALSE.equals(activo)) throw prohibidoEnCampo("activo", "No puedes desactivar tu propia cuenta.");
        if (rol != null && rol != u.getRol()) throw prohibidoEnCampo("rol", "No puedes cambiar tu propio rol.");
    }

    private static ApiException prohibidoEnCampo(String campo, String mensaje) {
        return new ApiException(HttpStatus.FORBIDDEN, mensaje, Map.of(campo, mensaje));
    }

    static String exigirVinculo(String nutricionistaId) {
        if (nutricionistaId == null || nutricionistaId.isBlank()) {
            throw ApiException.validacion("nutricionistaId", "Selecciona el nutricionista vinculado.");
        }
        return nutricionistaId.trim();
    }

    /** U104, U105…: correlativo con la fila del contador bloqueada hasta el COMMIT. */
    private String siguienteId() {
        Contador contador = contadores.bloquear(Contador.USUARIO)
                .orElseGet(() -> contadores.save(new Contador(Contador.USUARIO, 0)));
        return String.format("U%03d", contador.siguiente());
    }
}
