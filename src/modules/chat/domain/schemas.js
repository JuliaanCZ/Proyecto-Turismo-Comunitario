const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const chatMessageSchema = Object.freeze({
  clientMessageId: Object.freeze({
    type: 'string',
    label: 'identificador del mensaje',
    required: true,
    min: 36,
    max: 36,
    pattern: UUID,
    message: 'El identificador del mensaje debe ser un UUID válido.',
  }),
  text: Object.freeze({
    type: 'string',
    label: 'mensaje',
    required: true,
    min: 1,
    max: 500,
    preserveExact: true,
  }),
});
