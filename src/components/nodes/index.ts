import { TriggerNode } from './TriggerNode';
import { SendTextNode } from './SendTextNode';
import { SendImageNode } from './SendImageNode';
import { SendButtonsNode } from './SendButtonsNode';
import { SendListNode } from './SendListNode';
import { SendStampCardNode } from './SendStampCardNode';
import { WaitForReplyNode } from './WaitForReplyNode';
import { ConditionNode } from './ConditionNode';
import { SetVariableNode } from './SetVariableNode';
import { ApiCallNode } from './ApiCallNode';
import { DelayNode } from './DelayNode';
import { LoopNode } from './LoopNode';
import { EndNode } from './EndNode';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const nodeTypes: Record<string, any> = {
  trigger: TriggerNode,
  sendText: SendTextNode,
  sendImage: SendImageNode,
  sendButtons: SendButtonsNode,
  sendList: SendListNode,
  sendStampCard: SendStampCardNode,
  waitForReply: WaitForReplyNode,
  condition: ConditionNode,
  setVariable: SetVariableNode,
  apiCall: ApiCallNode,
  delay: DelayNode,
  loop: LoopNode,
  end: EndNode,
};

export {
  TriggerNode,
  SendTextNode,
  SendImageNode,
  SendButtonsNode,
  SendListNode,
  SendStampCardNode,
  WaitForReplyNode,
  ConditionNode,
  SetVariableNode,
  ApiCallNode,
  DelayNode,
  LoopNode,
  EndNode,
};
