export const debounce = <T extends any[]>(
    fn: (...args: T) => void,
    timeout: number,
) => {
    let handle = 0;
    let lastArgs: T | null = null;
    const ret = (...args: T) => {
        lastArgs = args;
        clearTimeout(handle);
        handle = window.setTimeout(() => {
            lastArgs = null;
            fn(...args);
        }, timeout);
    };
    ret.flush = () => {
        clearTimeout(handle);
        if (lastArgs) {
            const _lastArgs = lastArgs;
            lastArgs = null;
            fn(..._lastArgs);
        }
    };
    ret.cancel = () => {
        lastArgs = null;
        clearTimeout(handle);
    };
    return ret;
};


function getMimeType(fileExtension: String) {
    switch (fileExtension) {
        case "svg":
            return "image/svg+xml";
        case "png":
            return "image/png";
        case "excalidraw":
            return "application/json";
        default:
            return "";
    }
}

export function getBlob(fileData: BlobPart, fileExtension: String) {
    const blob = new Blob([fileData], { type: getMimeType(fileExtension) });
    const file = new File([blob], `image.${fileExtension}`, { type: getMimeType(fileExtension) });
    return file;
}

export function getExtension(filename: string): string {
    const base = filename.split("/").pop();
    if (!base) return ""; // safeguard for undefined or empty

    const parts = base.split(".");
    return parts.length > 1 ? parts.pop()! : "";
}
