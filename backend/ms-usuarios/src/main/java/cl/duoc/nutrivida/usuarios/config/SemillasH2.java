package cl.duoc.nutrivida.usuarios.config;

import cl.duoc.nutrivida.usuarios.model.Articulo;
import cl.duoc.nutrivida.usuarios.model.Contador;
import cl.duoc.nutrivida.usuarios.model.Rol;
import cl.duoc.nutrivida.usuarios.model.Usuario;
import cl.duoc.nutrivida.usuarios.repository.ArticuloRepository;
import cl.duoc.nutrivida.usuarios.repository.ContadorRepository;
import cl.duoc.nutrivida.usuarios.repository.UsuarioRepository;
import java.time.LocalDate;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Perfil H2 (sin "mysql") y pruebas: carga las mismas semillas de database/01_usuarios.sql.
 * En MySQL no corre: ahí las tablas y las semillas las crea el script.
 */
@Component
@Profile("!mysql")
public class SemillasH2 implements ApplicationRunner {

    private static final LocalDate CREADO = LocalDate.of(2026, 8, 1);

    private final UsuarioRepository usuarios;
    private final ArticuloRepository articulos;
    private final ContadorRepository contadores;
    private final PasswordEncoder codificador;

    public SemillasH2(UsuarioRepository usuarios, ArticuloRepository articulos, ContadorRepository contadores,
            PasswordEncoder codificador) {
        this.usuarios = usuarios;
        this.articulos = articulos;
        this.contadores = contadores;
        this.codificador = codificador;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (usuarios.count() == 0) cargar();
    }

    /** Borra todo y deja las semillas de EP2. Las pruebas lo llaman antes de cada caso. */
    @Transactional
    public void cargar() {
        usuarios.deleteAll();
        articulos.deleteAll();
        contadores.deleteAll();
        String admin = codificador.encode("Admin2026!");
        String recepcion = codificador.encode("Recepcion2026!");
        String nutri = codificador.encode("Nutri2026!");
        String paciente = codificador.encode("Paciente2026!");
        usuarios.save(u("U001", "Administración", "NutriVida", "9.876.543-3", "admin@nutrivida.cl", "+56 9 1111 0001", "1985-03-12", admin, Rol.ADMIN, null, true));
        usuarios.save(u("U002", "Marta", "Ríos", "15.999.888-6", "recepcion@nutrivida.cl", "+56 9 1111 0002", "1990-07-21", recepcion, Rol.SECRETARIA, null, true));
        usuarios.save(u("U010", "Carolina", "Fuentes M.", "16.222.333-K", "cfuentes@nutrivida.cl", "+56 9 1111 0010", "1987-01-30", nutri, Rol.NUTRICIONISTA, "NUT001", true));
        usuarios.save(u("U011", "Rodrigo", "Sepúlveda A.", "13.777.666-9", "rsepulveda@nutrivida.cl", "+56 9 1111 0011", "1982-11-05", nutri, Rol.NUTRICIONISTA, "NUT002", true));
        usuarios.save(u("U012", "Daniela", "Morales C.", "17.654.321-3", "dmorales@nutrivida.cl", "+56 9 1111 0012", "1991-06-18", nutri, Rol.NUTRICIONISTA, "NUT003", true));
        usuarios.save(u("U013", "Felipe", "Araya R.", "18.444.555-7", "faraya@nutrivida.cl", "+56 9 1111 0013", "1993-09-09", nutri, Rol.NUTRICIONISTA, "NUT004", true));
        usuarios.save(u("U100", "Javiera", "Soto", "19.876.543-0", "javiera.soto@correo.cl", "+56 9 2222 0100", "1997-04-14", paciente, Rol.PACIENTE, null, true));
        usuarios.save(u("U101", "Tomás", "Huenchullán", "20.456.789-1", "tomas.h@correo.cl", "+56 9 2222 0101", "2000-12-02", paciente, Rol.PACIENTE, null, true));
        usuarios.save(u("U102", "Ana", "Pérez", "21.333.444-1", "ana.perez@correo.cl", "+56 9 2222 0102", "2002-08-27", paciente, Rol.PACIENTE, null, true));
        usuarios.save(u("U103", "Pedro", "Lagos", "22.111.222-9", "pedro.lagos@correo.cl", "+56 9 2222 0103", "1999-05-20", paciente, Rol.PACIENTE, null, false));
        articulos.save(new Articulo("colaciones-jornada-laboral", "Colaciones para la jornada laboral",
                "Ideas simples para llegar con menos hambre al almuerzo y a la once.",
                "Una colación ayuda a repartir la energía del día. Prefiere opciones que combinen fruta o verdura con una fuente de proteína, como yogur natural, un huevo duro o un puñado de frutos secos. Prepáralas la noche anterior y llévalas en un envase cerrado. Si tienes un plan alimenticio, sigue las porciones que acordaste con tu nutricionista.",
                "NUT003", LocalDate.of(2026, 9, 15)));
        articulos.save(new Articulo("hidratacion-antes-de-entrenar", "Hidratación antes de entrenar",
                "Llegar bien hidratado al entrenamiento empieza horas antes.",
                "Bebe agua de forma regular durante el día, no solo cuando tengas sed. Antes de entrenar, toma un vaso de agua con algo de anticipación. En sesiones largas o con mucho calor, conversa con tu nutricionista si necesitas bebidas con electrolitos. Cada persona tiene requerimientos distintos: tu plan debe ajustarse a tu entrenamiento.",
                "NUT002", LocalDate.of(2026, 10, 1)));
        contadores.save(new Contador(Contador.USUARIO, 103));
    }

    private static Usuario u(String id, String nombre, String apellido, String rut, String correo, String telefono,
            String nacimiento, String clave, Rol rol, String nutricionistaId, boolean activo) {
        return new Usuario(id, nombre, apellido, rut, correo, telefono, LocalDate.parse(nacimiento), clave, rol,
                nutricionistaId, activo, CREADO);
    }
}
