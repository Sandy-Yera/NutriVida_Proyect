package cl.duoc.nutrivida.usuarios.model;

/** Roles del contrato (§3). El JWT los lleva como texto y Spring los ve como ROLE_X. */
public enum Rol {
    ADMIN, SECRETARIA, NUTRICIONISTA, PACIENTE
}
