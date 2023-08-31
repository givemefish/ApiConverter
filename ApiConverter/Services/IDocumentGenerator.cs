namespace ApiConverter.Services;

public interface IDocumentGenerator
{
    byte[] Generate(string json);
}