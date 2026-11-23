package cl.duoc.nutrivida.usuarios.service;

import cl.duoc.nutrivida.usuarios.exception.ApiException;
import cl.duoc.nutrivida.usuarios.model.Contador;
import cl.duoc.nutrivida.usuarios.model.Rol;
import cl.duoc.nutrivida.usuarios.model.Usuario;
import cl.duoc.nutrivida.usuarios.repository.ContadorRepository;
import cl.duoc.nutrivida.usuarios.repository.UsuarioRepository;
import java.time.Clock;
import java.time.LocalDate;
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

    public UsuarioService(UsuarioRepository usuarios, ContadorRepository contadores, PasswordEncoder codificador,
            Clock reloj) {
        this.usuarios = usuarios;
        this.contadores = contadores;
        this.codificador = codificador;
        this.reloj = reloj;
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
