import { SYSTEM_PROGRAMS } from './constants';
import { TransactionAdapter } from './transaction-adapter';
import { ClassifiedInstruction } from './types/common';
import { getInstructionData } from './utils';

export class InstructionClassifier {
  private instructionMap: Map<string, ClassifiedInstruction[]> = new Map();

  constructor(private adapter: TransactionAdapter) {
    this.classifyInstructions();
  }

  private classifyInstructions() {
    // outer instructions
    this.adapter.instructions.forEach((instruction: any, outerIndex: any) => {
      const programId = this.adapter.getInstructionProgramId(instruction);
      this.addInstruction({
        instruction,
        programId,
        outerIndex,
      });
    });

    // innerInstructions
    const innerInstructions = this.adapter.innerInstructions;
    if (innerInstructions) {
      innerInstructions.forEach((set) => {
        set.instructions.forEach((instruction, innerIndex) => {
          const programId = this.adapter.getInstructionProgramId(instruction);
          this.addInstruction({
            instruction,
            programId,
            outerIndex: set.index,
            innerIndex,
          });
        });
      });
    }
  }

  private addInstruction(classified: ClassifiedInstruction) {
    if (!classified.programId) return;

    const instructions = this.instructionMap.get(classified.programId) || [];
    instructions.push(classified);
    this.instructionMap.set(classified.programId, instructions);
  }

  public getInstructions(programId: string): ClassifiedInstruction[] {
    return this.instructionMap.get(programId) || [];
  }

  public getMultiInstructions(programIds: string[]): ClassifiedInstruction[] {
    return programIds.map((programId) => this.getInstructions(programId)).flat();
  }

  public getInstructionByDescriminator(descriminator: Buffer, slice: number): ClassifiedInstruction | null {
    for (const instructions of this.instructionMap.values()) {
      for (const instruction of instructions) {
        const data = getInstructionData(instruction.instruction);

        if (data.length >= slice && descriminator.equals(data.slice(0, slice))) {
          return instruction;
        }
      }
    }
    return null;
  }

  public getAllProgramIds(): string[] {
    return Array.from(this.instructionMap.keys()).filter((it) => !SYSTEM_PROGRAMS.includes(it));
  }
}
