import ePub from "epubjs"

export async function renderEPUB(blob, containerId = "viewer"){
    const book = ePub(blob);
    const rendition = book.renderTo(containerId);
    await book.ready;
    await rendition.display();
    return rendition;
}