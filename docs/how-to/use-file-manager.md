# How-To: Use the Windows-Style File Manager

Polyglot Code Studio includes an interactive file manager supporting multi-selection, drag-and-drop reorganization, ZIP archiving, archive inspection, and two-stage soft delete (Trash).

---

## 1. File Selection & Navigation

- **Single Selection**: Click any file to select and open it in the active editor tab.
- **Toggle Multi-Select**: Hold `Ctrl` (or `Cmd` on macOS) while clicking files to toggle individual selections.
- **Range Selection**: Hold `Shift` and click two files to select the continuous range between them.

---

## 2. Inline Renaming

1. Select a file and press `F2`, or right-click and choose **Rename**, or double-click the file name.
2. Edit the name in place.
3. Press `Enter` to commit the rename or `Escape` to cancel.
4. *Validation rules*: File names cannot be blank, cannot contain slashes (`/` or `\`), and must maintain a valid source extension.

---

## 3. Drag-and-Drop Organization

- Drag any selected file or folder onto a target folder in the file tree.
- The destination folder highlights in blue.
- Release the mouse button to move the file to the new location.

---

## 4. ZIP Archive Creation & Extraction

### Creating an Archive
1. Select one or more files in the explorer (or leave none selected to archive the entire workspace).
2. Click the **Archive (ZIP)** button in the explorer toolbar or choose **Create ZIP Archive** from the context menu.
3. The browser generates and downloads the compressed `.zip` bundle using `fflate`.

### Safe Extraction & Archive Preview
1. When opening or uploading a ZIP file, the **Archive Preview Dialog** appears.
2. The dialog checks the archive against `ZIP_LIMITS`:
   - Maximum uncompressed size: 50 MiB.
   - Maximum individual file size: 5 MiB.
   - Maximum total files: 500 files.
   - Compression ratio limit: 100:1 (ZIP bomb mitigation).
   - Zero tolerance for path traversal (`../`) and Zombie ZIP headers (CVE-2026-0866).
3. If valid, click **Extract to Workspace** to unpack the files directly into the Virtual File System.

---

## 5. Soft Delete & Trash Management

Polyglot Code Studio uses a **two-stage deletion workflow**:

1. **Move to Trash**:
   - Select one or more files and press `Delete`, or click the trash can icon.
   - The file is soft-deleted and moved into `.trash/<uuid>/` with metadata (`originalPath`, `deletedAt`, `sizeBytes`, `contentType`).
2. **Restoring Files**:
   - In the Side Panel header, switch the view mode to **Trash**.
   - Review deleted files, their original paths, and deletion timestamps.
   - Click the **Restore** button (`RotateCcw`) to return the file to its original path.
3. **Emptying Trash**:
   - Click **Empty Trash** in the trash header to permanently purge all deleted items.
