package cl.duoc.nutrivida.clinica.security;

import java.util.Arrays;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * Reglas de acceso de ms-clinica. Sin sesión de servidor (STATELESS): cada petición trae su JWT.
 * Lo público se declara aquí; lo demás exige token, y el rol fino va con @PreAuthorize en cada
 * endpoint, para que quede a la vista junto al método que protege.
 */
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    /** Swagger y token de desarrollo: siempre accesibles. */
    private static final String[] PUBLICAS = { "/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs/**", "/api/dev/**", "/error" };

    /** Consultas GET públicas de este microservicio (Forma D: solo lo indispensable). */
    private static final String[] GET_PUBLICAS = { "/api/servicios/**", "/api/nutricionistas/**" };

    @Bean
    public SecurityFilterChain cadena(HttpSecurity http, JwtFiltro jwtFiltro,
            ManejadorErroresSeguridad manejador) throws Exception {
        http
                .csrf(csrf -> csrf.disable()) // API sin cookies: el token va en un header, no hay CSRF
                .cors(cors -> { })
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(e -> e.authenticationEntryPoint(manejador).accessDeniedHandler(manejador))
                .authorizeHttpRequests(a -> a
                        .requestMatchers(PUBLICAS).permitAll()
                        .requestMatchers(HttpMethod.GET, GET_PUBLICAS).permitAll()
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .anyRequest().authenticated())
                .addFilterBefore(jwtFiltro, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    /**
     * Sin usuarios en memoria: aquí nadie inicia sesión con usuario y clave (eso lo hace ms-usuarios).
     * Las peticiones se autentican solo con el JWT (JwtFiltro). Sin este bean, Spring Boot crea un
     * usuario "user" con una clave al azar y lo avisa en el log ("Using generated security password").
     */
    @Bean
    public UserDetailsService sinUsuariosEnMemoria() {
        return new InMemoryUserDetailsManager();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource(@Value("${nutrivida.cors.origenes}") String origenes) {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(Arrays.stream(origenes.split(",")).map(String::trim).toList());
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        UrlBasedCorsConfigurationSource fuente = new UrlBasedCorsConfigurationSource();
        fuente.registerCorsConfiguration("/api/**", config);
        return fuente;
    }
}
