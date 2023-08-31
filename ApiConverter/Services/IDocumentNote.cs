namespace ApiConverter.Services;


public interface IDocumentNote
{
    public string[] Get();

    public void Set(string[] list);
}

public interface IApiDocumentNote : IDocumentNote
{
}

public interface IUpDocumentNote : IDocumentNote
{
}