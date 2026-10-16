export default function EnConstruccion({ titulo, tarea }) {
  return (
    <section className="container py-4">
      <h1>{titulo}</h1>
      <p className="text-body-secondary">Vista en construcción (tarea {tarea}).</p>
    </section>
  );
}