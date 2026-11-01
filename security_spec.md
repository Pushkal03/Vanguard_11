# Vanguard 11 — Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Identity & Ownership**: A `StudentWorkspace` at `/workspaces/{workspaceId}` can only be created by a signed-in user with a verified email (`request.auth.token.email_verified == true`) where `workspaceId == request.auth.uid` and `incoming().ownerId == request.auth.uid`.
2. **5-Device Cap (`deviceIds` & `deviceNames`)**: `deviceIds` and `deviceNames` are strictly bounded lists with `.size() <= 5`.
3. **2-Parent Cap (`parentIds`)**: `parentIds` is a strictly bounded list of up to 2 parent account UIDs (`.size() <= 2`).
4. **Master Gate for Subcollections**: Every document in `/workspaces/{workspaceId}/moments/{momentId}` and `/workspaces/{workspaceId}/files/{fileId}` requires the parent `/workspaces/{workspaceId}` document to exist and the caller to be either the workspace `ownerId` or a linked parent in `parentIds`.
5. **Temporal Integrity**: All `createdAt` and `updatedAt` fields must equal `request.time`. `createdAt` and `ownerId` are immutable on updates.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Payload 1 (Unverified Email Spoof)**: Attempt to create `/workspaces/{uid}` when `request.auth.token.email_verified == false`.
2. **Payload 2 (Identity Spoofing on Workspace Create)**: Attempt to create `/workspaces/victimUid` with `ownerId: "victimUid"` from `attackerUid`.
3. **Payload 3 (6th Device Overflow Attack)**: Attempt to update `deviceIds` with 6 device IDs (`['d1','d2','d3','d4','d5','d6']`).
4. **Payload 4 (3rd Parent Overflow Attack)**: Attempt to update `parentIds` with 3 parent UIDs (`['p1','p2','p3']`).
5. **Payload 5 (Shadow Field Injection)**: Attempt to update `/workspaces/{uid}` including an undeclared field `isAdmin: true`.
6. **Payload 6 (Immutable `ownerId` Hijack)**: Attempt to update `ownerId` on an existing `/workspaces/{uid}` document.
7. **Payload 7 (Immutable `createdAt` Tampering)**: Attempt to modify `createdAt` during an update to `/workspaces/{uid}`.
8. **Payload 8 (Client Timestamp Forgery)**: Attempt to create a `StudentMoment` where `createdAt != request.time`.
9. **Payload 9 (ID Poisoning / Oversized Path Variable)**: Attempt to create `/workspaces/{workspaceId}/moments/{momentId}` with a 200-character or special-character `momentId`.
10. **Payload 10 (Orphaned Subcollection Write)**: Attempt to create `/workspaces/nonExistentWorkspace/files/file1` when `/workspaces/nonExistentWorkspace` does not exist.
11. **Payload 11 (Unauthorized Non-Member Read)**: Authenticated user not in `parentIds` and not `ownerId` attempting `get` on `/workspaces/{workspaceId}`.
12. **Payload 12 (Value Poisoning on `latestFileContent`)**: Attempt to write a 20,000-character string to `latestFileContent` (exceeding `maxLength: 8000`).
