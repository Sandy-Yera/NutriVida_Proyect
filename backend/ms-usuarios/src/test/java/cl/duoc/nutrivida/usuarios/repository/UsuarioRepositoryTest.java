package cl.duoc.nutrivida.usuarios.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import cl.duoc.nutrivida.usuarios.config.SemillasH2;
import cl.duoc.nutrivida.usuarios.model.Rol;
import cl.duoc.nutrivida.usuarios.model.Usuario;
import java.time.LocalDate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;

/** G-31: semillas de EP2, BCrypt y las restricciones UNIQUE como última barrera. */
@SpringBootTest
class UsuarioRepositoryTest {

    @Autowired UsuarioRepository usuarios;
    @Autowired ArticuloRepository articulos;
    @Autowired ContadorRepository contadores;
    @Autowired SemillasH2 semillas;
    @Autowired PasswordEncoder codificador;

    @BeforeEach
    void preparar() {
        semillas.cargar();
    }

    static Usuario nuevo(String id, String rut, String correo) {
        return new Usuario(id, "Prueba", "Uno", rut, correo, "+56 9 3333 0000", null, "x", Rol.PACIENTE, null,
                true, LocalDate.of(2026, 11, 23));
    }

    @Test
    @DisplayName("Semillas: los IDs de EP2, una cuenta por rol y la clave solo como hash BCrypt")
    void semillasDeEp2() {
        assertThat(usuarios.count()).isEqualTo(10);
        assertThat(usuarios.findAll()).extracting(Usuario::getRol)
                .contains(Rol.ADMIN, Rol.SECRETARIA, Rol.NUTRICIONISTA, Rol.PACIENTE);
        Usuario admin = usuarios.findByCorreo("admin@nutrivida.cl").orElseThrow();
        assertThat(admin.getId()).isEqualTo("U001");
        assertThat(admin.getClave()).startsWith("$2a$").hasSize(60);
        assertThat(codificador.matches("Admin2026!", admin.getClave())).isTrue();
        assertThat(usuarios.findById("U010").orElseThrow().getNutricionistaId()).isEqualTo("NUT001");
        assertThat(usuarios.findById("U103").orElseThrow().isActivo()).isFalse();
        assertThat(contadores.findById("USUARIO").orElseThrow().getUltimo()).isEqualTo(103);
    }

    @Test
    @DisplayName("Artículos: del más reciente al más antiguo")
    void articulosOrdenados() {
        assertThat(articulos.findAllByOrderByFechaDesc()).extracting("id")
                .containsExactly("hidratacion-antes-de-entrenar", "colaciones-jornada-laboral");
    }

    @Test
    @DisplayName("UNIQUE(correo): la base rechaza un correo repetido aunque el service no lo revise")
    void correoUnico() {
        assertThatThrownBy(() -> usuarios.saveAndFlush(nuevo("U900", "11.111.111-1", "admin@nutrivida.cl")))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("UNIQUE(rut): la base rechaza un RUT repetido")
    void rutUnico() {
        assertThatThrownBy(() -> usuarios.saveAndFlush(nuevo("U901", "9.876.543-3", "otro@correo.cl")))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("RN-30: un rol distinto de NUTRICIONISTA no conserva el nutricionistaId")
    void soloNutricionistaTieneVinculo() {
        Usuario u = usuarios.findById("U010").orElseThrow();
        u.cambiarRol(Rol.SECRETARIA, "NUT001");
        assertThat(u.getNutricionistaId()).isNull();
    }

    @Test
    @DisplayName("Duplicados al editar: se excluye la propia cuenta")
    void duplicadosExcluyenPropia() {
        assertThat(usuarios.existsByCorreoAndIdNot("admin@nutrivida.cl", "U001")).isFalse();
        assertThat(usuarios.existsByCorreoAndIdNot("admin@nutrivida.cl", "U002")).isTrue();
        assertThat(usuarios.existsByNutricionistaIdAndIdNot("NUT001", "U011")).isTrue();
    }
}
