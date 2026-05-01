/**
 * Exit code constants for driftguard scan command.
 * - Ok (0): No drift detected
 * - DriftFound (1): Drift was detected
 * - ExecutionError (2): Input/config/runtime error
 */
export enum ExitCode {
  Ok = 0,
  DriftFound = 1,
  ExecutionError = 2,
}

/**
 * Base class for all DriftGuard errors.
 * Carries an exitCode property so CLI can map errors to process exit codes deterministically.
 */
export class DriftGuardError extends Error {
  public readonly exitCode: ExitCode;

  constructor(message: string, exitCode: ExitCode = ExitCode.ExecutionError) {
    super(message);
    this.name = 'DriftGuardError';
    this.exitCode = exitCode;
    // Fix prototype chain for Error subclasses in ES2015+
    Object.setPrototypeOf(this, DriftGuardError.prototype);
  }
}