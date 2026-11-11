-- Local development tenant only. No auth users, profiles, or credentials are seeded.
-- Idempotent so repeated local resets keep one stable AGS tenant.

insert into public.tenants (
  id,
  name,
  subdomain,
  status,
  theme,
  features,
  max_clients
)
select
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'AGS GluteHouse (Local)',
  'ags',
  'ACTIVE',
  '{
    "logoUrl": null,
    "primaryColor": "#ff0a78",
    "secondaryColor": "#d9005d",
    "backgroundColor": "#050505",
    "accentColor": "#ff70b5"
  }'::jsonb,
  '{
    "personalizedRoutines": true,
    "workoutTimer": true,
    "loadTracking": true,
    "whatsapp": true,
    "groupClasses": false
  }'::jsonb,
  100
where not exists (
  select 1
  from public.tenants
  where subdomain = 'ags'
);

insert into public.tenants (
  id,
  name,
  subdomain,
  status,
  theme,
  features,
  max_clients
)
select
  'a0000000-0000-4000-8000-000000000002'::uuid,
  'Gym Suspendido (Local Test)',
  'pausedgym',
  'SUSPENDED',
  '{
    "logoUrl": null,
    "primaryColor": "#ff0a78",
    "secondaryColor": "#d9005d",
    "backgroundColor": "#050505",
    "accentColor": "#ff70b5"
  }'::jsonb,
  '{
    "personalizedRoutines": true,
    "workoutTimer": true,
    "loadTracking": true,
    "whatsapp": true,
    "groupClasses": false
  }'::jsonb,
  100
where not exists (
  select 1
  from public.tenants
  where subdomain = 'pausedgym'
);

insert into public.exercise_catalog (
  id,
  catalog_key,
  name,
  focus,
  primary_muscles,
  secondary_muscles,
  equipment,
  movement_pattern,
  difficulty,
  instructions,
  tips
)
values
  (
    'b2000000-0000-4000-8000-000000000001', 'hip-thrust-barbell', 'Hip thrust con barra',
    'GLUTES', array['gluteus maximus'], array['hamstrings'], array['BARBELL', 'BENCH']::public.exercise_equipment[],
    'HIP_THRUST', 'INTERMEDIATE',
    'Apoya la parte alta de la espalda en un banco estable y coloca la barra sobre la cadera con protección. Eleva la cadera hasta alinear tronco y muslos y baja con control.',
    'Mantén las costillas controladas y termina el movimiento contrayendo los glúteos, sin hiperextender la zona lumbar.'
  ),
  (
    'b2000000-0000-4000-8000-000000000002', 'romanian-deadlift-barbell', 'Peso muerto rumano con barra',
    'GLUTES', array['hamstrings', 'gluteus maximus'], array['erector spinae'], array['BARBELL']::public.exercise_equipment[],
    'HINGE', 'INTERMEDIATE',
    'Sostén la barra frente a los muslos, flexiona ligeramente las rodillas y lleva la cadera hacia atrás. Desliza la barra cerca de las piernas y vuelve extendiendo la cadera.',
    'Conserva la espalda neutra y limita el descenso al rango que puedas controlar.'
  ),
  (
    'b2000000-0000-4000-8000-000000000003', 'bulgarian-split-squat-dumbbells', 'Sentadilla búlgara con mancuernas',
    'GLUTES', array['gluteus maximus', 'quadriceps'], array['gluteus medius'], array['DUMBBELLS', 'BENCH']::public.exercise_equipment[],
    'LUNGE', 'INTERMEDIATE',
    'Coloca el empeine trasero sobre un banco bajo y adelanta el pie de apoyo. Desciende flexionando ambas piernas y empuja el suelo para volver.',
    'Ajusta la distancia de los pies para mantener equilibrio y una trayectoria cómoda de la rodilla.'
  ),
  (
    'b2000000-0000-4000-8000-000000000004', 'cable-glute-kickback', 'Extensión de cadera en polea',
    'GLUTES', array['gluteus maximus'], array['hamstrings'], array['CABLE']::public.exercise_equipment[],
    'HIP_THRUST', 'BEGINNER',
    'Conecta una tobillera a la polea baja y sujétate al soporte. Lleva la pierna hacia atrás desde la cadera y regresa lentamente.',
    'Usa un rango controlado y evita girar la pelvis o arquear la espalda.'
  ),
  (
    'b2000000-0000-4000-8000-000000000005', 'machine-hip-abduction', 'Abducción de cadera en máquina',
    'GLUTES', array['gluteus medius', 'gluteus minimus'], array['gluteus maximus'], array['MACHINE']::public.exercise_equipment[],
    'ABDUCTION', 'BEGINNER',
    'Ajusta el asiento y apoya las piernas en las almohadillas. Separa las rodillas con control y vuelve sin dejar que las pesas choquen.',
    'Mantén la pelvis estable y elige una apertura que no cause molestias.'
  ),
  (
    'b2000000-0000-4000-8000-000000000006', 'goblet-squat-dumbbell', 'Sentadilla goblet con mancuerna',
    'GLUTES', array['quadriceps', 'gluteus maximus'], array['core'], array['DUMBBELLS']::public.exercise_equipment[],
    'SQUAT', 'BEGINNER',
    'Sostén una mancuerna frente al pecho, separa los pies a una posición cómoda y flexiona cadera y rodillas. Empuja el suelo para volver a estar de pie.',
    'Mantén el peso cerca del cuerpo y apoya el pie completo durante el movimiento.'
  ),
  (
    'b2000000-0000-4000-8000-000000000007', 'glute-bridge-bodyweight', 'Puente de glúteos',
    'GLUTES', array['gluteus maximus'], array['hamstrings', 'core'], array['BODYWEIGHT']::public.exercise_equipment[],
    'HIP_THRUST', 'BEGINNER',
    'Acuéstate boca arriba con rodillas flexionadas y pies apoyados. Eleva la pelvis hasta alinear caderas y tronco y baja despacio.',
    'Evita empujar con la espalda; mantén las costillas controladas.'
  ),
  (
    'b2000000-0000-4000-8000-000000000008', 'dumbbell-step-up', 'Subida al cajón con mancuernas',
    'GLUTES', array['quadriceps', 'gluteus maximus'], array['calves'], array['DUMBBELLS', 'BENCH']::public.exercise_equipment[],
    'LOCOMOTION', 'INTERMEDIATE',
    'Coloca un pie completo sobre una plataforma estable. Empuja con esa pierna para subir y desciende con control antes de alternar.',
    'Usa una altura que permita mantener el equilibrio y evita impulsarte con la pierna de atrás.'
  ),
  (
    'b2000000-0000-4000-8000-000000000009', 'dumbbell-row', 'Remo con mancuerna a una mano',
    'UPPER_BODY', array['latissimus dorsi'], array['biceps', 'middle trapezius'], array['DUMBBELLS', 'BENCH']::public.exercise_equipment[],
    'HORIZONTAL_PULL', 'BEGINNER',
    'Apoya una mano y una rodilla en un banco. Lleva la mancuerna hacia la cadera y bájala lentamente sin rotar el tronco.',
    'Mantén el hombro lejos de la oreja y el torso estable.'
  ),
  (
    'b2000000-0000-4000-8000-000000000010', 'machine-chest-press', 'Press de pecho en máquina',
    'UPPER_BODY', array['pectoralis major'], array['triceps', 'anterior deltoid'], array['MACHINE']::public.exercise_equipment[],
    'HORIZONTAL_PUSH', 'BEGINNER',
    'Ajusta el asiento para que las empuñaduras queden a la altura del pecho. Empuja al frente y regresa lentamente sin perder la posición.',
    'Mantén la espalda apoyada y evita bloquear los codos al extender.'
  ),
  (
    'b2000000-0000-4000-8000-000000000011', 'cable-lat-pulldown', 'Jalón al pecho en polea',
    'UPPER_BODY', array['latissimus dorsi'], array['biceps', 'middle trapezius'], array['CABLE']::public.exercise_equipment[],
    'VERTICAL_PULL', 'BEGINNER',
    'Sujeta la barra algo más abierta que los hombros y siéntate con los muslos fijados. Lleva la barra hacia la parte alta del pecho y vuelve arriba con control.',
    'Evita balancear el torso o tirar la barra detrás del cuello.'
  ),
  (
    'b2000000-0000-4000-8000-000000000012', 'dumbbell-shoulder-press', 'Press de hombros con mancuernas',
    'UPPER_BODY', array['deltoid'], array['triceps', 'upper trapezius'], array['DUMBBELLS']::public.exercise_equipment[],
    'VERTICAL_PUSH', 'INTERMEDIATE',
    'Con las mancuernas a la altura de los hombros, empuja hacia arriba y baja de forma controlada hasta la posición inicial.',
    'Mantén el abdomen activo y utiliza un rango sin dolor.'
  ),
  (
    'b2000000-0000-4000-8000-000000000013', 'dead-bug', 'Dead bug',
    'CORE', array['core'], array['hip flexors'], array['BODYWEIGHT']::public.exercise_equipment[],
    'CORE_STABILITY', 'BEGINNER',
    'Acuéstate boca arriba con brazos al techo y rodillas sobre las caderas. Extiende lentamente brazo y pierna contrarios y regresa alternando.',
    'Mantén la zona lumbar estable; reduce el rango si se arquea la espalda.'
  ),
  (
    'b2000000-0000-4000-8000-000000000014', 'kettlebell-deadlift', 'Peso muerto con kettlebell',
    'FULL_BODY', array['gluteus maximus', 'hamstrings'], array['core', 'forearms'], array['KETTLEBELL']::public.exercise_equipment[],
    'HINGE', 'BEGINNER',
    'Coloca la kettlebell entre los pies. Lleva la cadera hacia atrás, toma el asa y ponte de pie extendiendo caderas y rodillas.',
    'Mantén la carga cerca del cuerpo y apoya la kettlebell con control en cada repetición.'
  ),
  (
    'b2000000-0000-4000-8000-000000000015', 'pallof-press-cable', 'Press Pallof en polea',
    'CORE', array['core'], array['obliques', 'gluteus medius'], array['CABLE']::public.exercise_equipment[],
    'CORE_STABILITY', 'BEGINNER',
    'Colócate de lado a una polea a la altura del pecho. Sujeta el agarre frente al esternón, extiende los brazos y vuelve resistiendo la rotación.',
    'Mantén los pies firmes y la pelvis orientada al frente.'
  )
on conflict (catalog_key) do nothing;
