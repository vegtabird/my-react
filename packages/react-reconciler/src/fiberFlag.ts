export const NoFlags = 0b0000000;
export const Placement = 0b0000001;
export const Update = 0b0000010;
export const ChildDeletion = 0b0000100;
export const PassiveEffect = 0b0001000;
export const Ref = 0b00000000000000000001000000;

export type FiberFlag = number;

export const PassiveMask = PassiveEffect | ChildDeletion;
export const MutationMask = Placement | Update | ChildDeletion | Ref;
export const LayoutMask = Ref;
