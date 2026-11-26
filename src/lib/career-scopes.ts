// The existing resume grant keeps its original capabilities. New tools opt in individually.
export const scopeDescriptions: Record<string, string> = {
  resume: 'Read master resumes, use your credits to tailor a resume, and save requested versions.',
  'profile:read': 'Read career profiles and career records.',
  'profile:write': 'Create, edit and archive career profiles and records.',
  'answers:sensitive': 'Access answers you have marked sensitive when explicitly requested.',
  'applications:read': 'Read job applications, follow-ups and status history.',
  'applications:write': 'Manage job applications, follow-ups and status history.',
  'materials:read': 'Read application materials and saved resume versions.',
  'materials:write': 'Save, edit and archive application materials and resume versions.',
  'resume:generate': 'Generate resumes from career data and use generation credits.',
};
export const resourceScopes = Object.keys(scopeDescriptions);

function generationScopes(args: Record<string, unknown>) {
  return [
    'resume:generate',
    'profile:read',
    ...(args.application_id ? ['applications:read'] : []),
    ...(args.save_to_history ? ['materials:write'] : []),
  ];
}

export function rendersOwnedVersion(name: string, input: unknown) {
  return (
    name === 'rolepatch_render_resume_pdf' &&
    !!input &&
    typeof input === 'object' &&
    'version_id' in input
  );
}

export function careerToolScopes(name: string, input: unknown): string[] {
  const args = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
  if (name === 'rolepatch_generate_resume') {
    return generationScopes(args);
  }
  if (rendersOwnedVersion(name, args)) return ['materials:read'];
  const read = /_(list|get)$/.test(name);
  if (/^rolepatch_(profiles_|career_records_)/.test(name))
    return [
      read ? 'profile:read' : 'profile:write',
      ...(args.include_sensitive === true ? ['answers:sensitive'] : []),
    ];
  if (/^rolepatch_(applications_|application_events_)/.test(name))
    return [read ? 'applications:read' : 'applications:write'];
  if (name === 'rolepatch_materials_upsert' && args.reference_id)
    return ['materials:write', 'materials:read'];
  if (/^rolepatch_(materials_|resume_versions_)/.test(name))
    return [read ? 'materials:read' : 'materials:write'];
  if (
    [
      'rolepatch_resume_profiles',
      'rolepatch_resolve_job',
      'rolepatch_tailor_resume',
      'rolepatch_render_resume_pdf',
    ].includes(name)
  )
    return ['resume'];
  throw new Error('Missing MCP permission mapping');
}
